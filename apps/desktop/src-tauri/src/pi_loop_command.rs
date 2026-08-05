//! `PI-HOST-CONCURRENCY-1` §一：宿主专属线程与入站命令通道。
//!
//! 权威面 ADR-022 六-C.1（授权面语义）＋ ADR-009 2026-08-05 窄修订（端口面）。三条形状：
//!
//! 1. **宿主线程独占**。每条 logical session 的 {@link crate::pi_loop::PiLoopHost} 由一条专属
//!    线程独占持有并独占驱动；单写者不变量由线程独占继承，不新增第二状态真源。
//! 2. **入站命令通道**。外部（届时的 Tauri command 薄壳、headless 驱动）只经本通道与宿主
//!    线程交谈，运行期闭集恰四枚 `prompt | cancel | decision | teardown`。`start` 是**构造**
//!    入口，不在闭集内。通道是**进程内端口**，不是 IPC/HTTP/gateway wire，也不混入六-B 的
//!    sidecar wire 闭集——本模块因此零 packet、零 journal payload。
//! 3. **闭集外与错序一律具名拒绝**。闭集由 {@link HostCommand} 在编译期锁死；错序（活动
//!    prompt 期间再来 prompt、无活动 prompt 时 cancel、无悬置提案时 decision……）由
//!    {@link CommandRejection} 逐枚具名，**不静默丢弃**（总纲不变量 4）。

use std::collections::VecDeque;
use std::sync::mpsc::{self, Receiver, RecvTimeoutError, Sender};
use std::sync::{Arc, Mutex};
use std::thread::JoinHandle;
use std::time::Duration;

use crate::pi_loop::{HostError, PiLoopHost};
use crate::pi_loop_protocol::{CancelReason, Terminal};

/// 授权等待的轮询切片。ADR-022 六-C.1 把实现形态（有界轮询切片／reader 线程双源 recv）
/// 交实现票冻结——本票取**有界轮询切片**：泵与授权等待两处等待点各自以切片轮转，切片到点
/// 先服务命令再回去等，故「无总时限」与「可被命令唤醒」同时成立。
///
/// 切片是唤醒**延迟上界**，不是超时：切片到点而无事发生只是回到循环，不构成任何终态。
pub(crate) const COMMAND_POLL_SLICE: Duration = Duration::from_millis(5);

/// 运行期命令闭集（ADR-022 六-C.1）。
///
/// 枚举即闭集：闭集外命令在本进程内**构造不出来**，故「闭集外一律拒绝」是结构性的，
/// 不靠运行期判据。错序才需要运行期判据，见 {@link CommandRejection}。
///
/// **构造点在通道之外**：`pi_lane` 的 Tauri command 薄壳、headless 驱动与测试；
/// 本模块只解构不构造。
pub(crate) enum HostCommand {
    Prompt { request_id: String, text: String },
    Cancel { reason: CancelReason },
    Decision {
        operation_id: String,
        verdict: DecisionVerdict,
    },
    Teardown,
}

impl HostCommand {
    /// 运行期闭集的名字表。`start` 不在其中——它是构造入口。
    pub(crate) fn name(&self) -> &'static str {
        match self {
            HostCommand::Prompt { .. } => "prompt",
            HostCommand::Cancel { .. } => "cancel",
            HostCommand::Decision { .. } => "decision",
            HostCommand::Teardown => "teardown",
        }
    }
}

impl std::fmt::Debug for HostCommand {
    /// **只投影名字**。prompt 文本与 operationId 都是案件面的值，不该因为一句 `expect`
    /// 就出现在 panic 文案与 CI 日志里（承本 crate 既有体例：错误只带 `&'static str` 与闭集）。
    fn fmt(&self, formatter: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        formatter.write_str(self.name())
    }
}

/// 逐次授权回执的两支。它**不上 wire**：wire 与 journal 的十九型闭集零变化，
/// 授权结论仍以既有 `authorization_decided` 落账。构造点同 {@link HostCommand}，在通道之外。
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub(crate) enum DecisionVerdict {
    Approve,
    Deny,
}

/// 具名拒绝闭集。每一枚都对应一种**错序**，不是一种错误码——命令本身合法，只是此刻不该来。
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub(crate) enum CommandRejection {
    /// 活动 prompt 期间又来 prompt：具名拒绝、**不排队**（与六-D 禁 queue 同源）。
    PromptBusy,
    /// 无活动 prompt 时 cancel。
    NoActivePrompt,
    /// cancel 包已在途，第二枚不重发。
    CancelInFlight,
    /// 无悬置提案时来回执——**回执不追溯生效**那一族的落点。
    NoPendingProposal,
    /// 回执的 operationId 与当前悬置提案不符。
    OperationMismatch,
}

/// 命令的回执。
///
/// **入口根**（dead_code 收窄）：载荷的**读取**点在通道之外（发命令的那一方）。
#[allow(dead_code)]
pub(crate) enum CommandReply {
    /// prompt 的终态或具名失败。
    Prompt(Result<Terminal, HostError>),
    /// teardown 的收摊结局。**不吞**：`shutdown` 全序失败照实回给调用方
    /// （落账另在 journal，两处不互相顶名）。
    Teardown(Result<(), HostError>),
    Accepted,
    Rejected(CommandRejection),
}

/// 一枚失效丢弃的授权回执。**不静默**：逐枚进本登记册，可被投影面与验收读取。
///
/// 它不进 journal：journal payload 十九型闭集零变化，而「回执来晚了」不是账本事实——
/// 账本上那一枚提案已经有它自己的 `authorization_decided`。
#[derive(Debug, Clone, PartialEq, Eq)]
pub(crate) struct DiscardedReceipt {
    pub(crate) operation_id: String,
    pub(crate) reason: CommandRejection,
}

/// 命令连同它的回执信道。
pub(crate) struct Envelope {
    pub(crate) command: HostCommand,
    reply: Sender<CommandReply>,
}

impl Envelope {
    /// 回执信道对端可能已被丢弃（发命令的一方不等回执），故一律忽略 send 结果。
    pub(crate) fn answer(self, reply: CommandReply) {
        let _ = self.reply.send(reply);
    }
    pub(crate) fn accept(self) {
        self.answer(CommandReply::Accepted);
    }
    pub(crate) fn reject(self, reason: CommandRejection) {
        self.answer(CommandReply::Rejected(reason));
    }
}

/// 外部握着的发端。`Clone` 是有意的：Tauri command 薄壳每次调用各持一份，
/// 全部投进同一条 session 的通道。
#[derive(Clone)]
pub(crate) struct CommandSender {
    tx: Sender<Envelope>,
}

impl CommandSender {
    /// 投一枚命令，拿回**这一枚**命令的回执信道。宿主线程不回则信道断开——
    /// 调用方读到 `Err` 即「宿主已不在」，不是「命令被静默吃掉」。
    /// 这是 pi 宿主对外的**全部**表面；生产消费点是 `pi_lane` 的 Tauri command 薄壳。
    pub(crate) fn send(&self, command: HostCommand) -> Result<Receiver<CommandReply>, HostCommand> {
        let (reply_tx, reply_rx) = mpsc::channel();
        match self.tx.send(Envelope {
            command,
            reply: reply_tx,
        }) {
            Ok(()) => Ok(reply_rx),
            Err(mpsc::SendError(envelope)) => Err(envelope.command),
        }
    }
}

/// 入站命令通道的宿主侧。
///
/// 两处等待点共用同一枚 bus：泵（等 sidecar stdout）与授权等待（等 decision 回执）。
/// 两者都跑在同一条宿主线程上，故 `Mutex` 只为跨 `Arc` 共享所有权，不承担线程间互斥语义。
pub(crate) struct CommandBus {
    tx: Sender<Envelope>,
    rx: Mutex<Receiver<Envelope>>,
    /// 授权等待期间收到、须由**泵**处理的命令（cancel／teardown）。放回队首而不是就地处理：
    /// cancel 包的发出与 terminal 收束是泵的职责，六-B.1 的 wire 语义因此一字不改。
    deferred: Mutex<VecDeque<Envelope>>,
    /// 当前悬置提案的 operationId。由授权等待入场时置、离场时清——**唯一**真源：
    /// 「回执有没有对象」这个判据在泵与 driver 两处读的是同一枚格子。
    pending: Mutex<Option<String>>,
    discarded: Mutex<Vec<DiscardedReceipt>>,
}

impl CommandBus {
    pub(crate) fn new() -> Arc<CommandBus> {
        let (tx, rx) = mpsc::channel();
        Arc::new(CommandBus {
            tx,
            rx: Mutex::new(rx),
            deferred: Mutex::new(VecDeque::new()),
            pending: Mutex::new(None),
            discarded: Mutex::new(Vec::new()),
        })
    }

    pub(crate) fn sender(&self) -> CommandSender {
        CommandSender {
            tx: self.tx.clone(),
        }
    }

    /// 非阻塞取一枚：deferred 先于新到，故被授权等待推回的 cancel 一定排在泵的下一轮首位。
    pub(crate) fn take_ready(&self) -> Option<Envelope> {
        if let Some(envelope) = self.deferred.lock().expect("deferred 未中毒").pop_front() {
            return Some(envelope);
        }
        self.rx.lock().expect("rx 未中毒").try_recv().ok()
    }

    /// 阻塞取一枚，**deferred 同样优先**：泵推回的 teardown 必须能被空闲循环取到，
    /// 否则它会睡在 `recv` 上等一枚永远不来的新命令。
    pub(crate) fn recv_blocking(&self) -> Option<Envelope> {
        if let Some(envelope) = self.deferred.lock().expect("deferred 未中毒").pop_front() {
            return Some(envelope);
        }
        self.rx.lock().expect("rx 未中毒").recv().ok()
    }

    /// 有界切片阻塞取一枚。`None` ⇒ 本切片内无命令；调用方回到自己的循环，**不**据此收束。
    pub(crate) fn poll(&self, slice: Duration) -> Option<Envelope> {
        if let Some(envelope) = self.deferred.lock().expect("deferred 未中毒").pop_front() {
            return Some(envelope);
        }
        match self.rx.lock().expect("rx 未中毒").recv_timeout(slice) {
            Ok(envelope) => Some(envelope),
            Err(RecvTimeoutError::Timeout) => None,
            // 发端全部被丢弃：不再会有命令。等待者回到循环，由自己的其他条件收束。
            Err(RecvTimeoutError::Disconnected) => None,
        }
    }

    pub(crate) fn defer(&self, envelope: Envelope) {
        self.deferred
            .lock()
            .expect("deferred 未中毒")
            .push_back(envelope);
    }

    pub(crate) fn set_pending(&self, operation_id: &str) {
        *self.pending.lock().expect("pending 未中毒") = Some(operation_id.to_string());
    }

    pub(crate) fn clear_pending(&self) {
        *self.pending.lock().expect("pending 未中毒") = None;
    }

    pub(crate) fn pending(&self) -> Option<String> {
        self.pending.lock().expect("pending 未中毒").clone()
    }

    pub(crate) fn register_discarded(&self, operation_id: &str, reason: CommandRejection) {
        self.discarded
            .lock()
            .expect("discarded 未中毒")
            .push(DiscardedReceipt {
                operation_id: operation_id.to_string(),
                reason,
            });
    }

    /// **入口根**：失效回执登记册的读面，消费点随 `PI-LANE-UI-1` 的投影落地。
    #[allow(dead_code)]
    pub(crate) fn discarded(&self) -> Vec<DiscardedReceipt> {
        self.discarded.lock().expect("discarded 未中毒").clone()
    }
}

/// 宿主专属线程：一条 logical session 一条线程，独占持有 `PiLoopHost`。
///
/// 线程体是**唯一**碰 host 的地方；外部只有 {@link CommandSender}。`&mut self` 的独占借用
/// 因此不再是「谁也调不到 cancel」的死结——cancel 与 decision 都是通道上的消息，泵在自己的
/// 等待点里取。
pub(crate) struct PiLoopThread {
    sender: CommandSender,
    join: Option<JoinHandle<PiLoopHost>>,
}

impl PiLoopThread {
    /// 接管一枚已构造好的 host（`start` 属构造入口，不在运行期闭集内）。
    /// 生产消费点：`pi_lane` 的 `pi_lane_start`（`PI-LANE-UI-1`）。
    pub(crate) fn adopt(host: PiLoopHost) -> PiLoopThread {
        let bus = host.command_bus();
        let sender = bus.sender();
        let join = std::thread::Builder::new()
            .name("pi-loop-host".to_string())
            .spawn(move || serve(host, bus))
            .expect("宿主线程可 spawn");
        PiLoopThread {
            sender,
            join: Some(join),
        }
    }

    /// 生产消费点：`pi_lane` 的四枚命令薄壳（`PI-LANE-UI-1`）。
    pub(crate) fn sender(&self) -> CommandSender {
        self.sender.clone()
    }

    /// 收回 host。**经 `teardown` 收摊**，不靠「发端被丢光」——通道的发端有一份住在 host
    /// 自己的 bus 里，永远不会随外部 handle 一起归零，靠断连收摊会死等。
    /// 生产消费点：`pi_lane` 的 `pi_lane_teardown`（`PI-LANE-UI-1`）。
    pub(crate) fn join(mut self) -> PiLoopHost {
        let _ = self.sender.send(HostCommand::Teardown);
        let join = self.join.take().expect("只 join 一次");
        join.join().expect("宿主线程未 panic")
    }
}

impl Drop for PiLoopThread {
    /// 没被显式 `join` 也不留悬空线程：同样投 teardown 再等它收摊。
    fn drop(&mut self) {
        if let Some(join) = self.join.take() {
            let _ = self.sender.send(HostCommand::Teardown);
            let _ = join.join();
        }
    }
}

/// 空闲期的命令循环。活动 prompt 期间的命令由泵在自己的等待点里服务
/// （{@link crate::pi_loop::PiLoopHost::service_commands}），故这里只见「没有活动 prompt」
/// 那一半闭集。
fn serve(mut host: PiLoopHost, bus: Arc<CommandBus>) -> PiLoopHost {
    loop {
        // 阻塞等下一枚命令；发端全断即收摊（异常出口，正常出口是 teardown）。
        //
        // 泵在 prompt 中收到 teardown 时只把那一枚 prompt 按 Stop 收束，命令本体**推回**
        // deferred——真正的收摊由这里做，故「teardown 收摊」只有一处代码，不是两条路。
        let Some(envelope) = bus.recv_blocking() else {
            return host;
        };
        match &envelope.command {
            HostCommand::Prompt { request_id, text } => {
                let (request_id, text) = (request_id.clone(), text.clone());
                let outcome = host.prompt(&request_id, &text);
                envelope.answer(CommandReply::Prompt(outcome));
            }
            // 空闲期的 cancel／decision 都没有对象：具名拒绝，不静默丢弃。
            HostCommand::Cancel { .. } => envelope.reject(CommandRejection::NoActivePrompt),
            HostCommand::Decision { operation_id, .. } => {
                let operation_id = operation_id.clone();
                bus.register_discarded(&operation_id, CommandRejection::NoPendingProposal);
                envelope.reject(CommandRejection::NoPendingProposal);
            }
            HostCommand::Teardown => {
                let outcome = host.teardown();
                envelope.answer(CommandReply::Teardown(outcome));
                return host;
            }
        }
    }
}
