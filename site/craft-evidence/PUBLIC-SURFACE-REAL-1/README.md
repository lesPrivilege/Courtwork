# PUBLIC-SURFACE-REAL-1 · Work scripted 公开帧

productSha: `5187c797c6ced84188c0b4e8ae7b00ecb8e50922`

## R1 provenance 重摄

本次实现把 `productSha` 绑定到本票指定的产品 merge tip
`5187c797c6ced84188c0b4e8ae7b00ecb8e50922`，而不是沿用此前实现前的
`3a4a90e8a2cd43362ecfce09135bb637496f6b36`。重摄使用精确 detached capture worktree：
`/private/tmp/courtwork-public-surface-provenance-r1-capture`（HEAD 固定为上述完整 SHA）。

实际命令与环境：

```sh
VITE_COURTWORK_E2E=1 pnpm --filter @courtwork/desktop dev --port 1578
PORT=1578 OUT=/private/tmp/courtwork-public-surface-provenance-r1-capture-output THEMES=light \
  node apps/desktop/scripts/capture-pi-lane-states.mjs
```

随后从这次重摄的三张 PNG 以同一条机械路径派生六枚 WebP（`cwebp` 版本与原资产路径
一致）：1440 宽度使用 `cwebp -quiet -q 85`，720 宽度使用
`cwebp -quiet -q 85 -resize 720 450`。派生输出暂存于
`/private/tmp/courtwork-public-surface-provenance-r1-derived-webp`，未直接把临时文件纳入提交。

### 旧／新实物复算

下表的“旧”是实现 worktree 在重摄前的已入库实物，“新”是 detached `5187c797…` 重摄或由其派生
的临时实物。三张 PNG 与六枚 WebP 均 `cmp` 逐字节相同；因此本 R1 不制造无意义的二进制 diff，
只更新 provenance 与机器门，并保留这次重摄命令和复算结果。

| 实物 | 旧 SHA-256 | 新 SHA-256 | bytes（旧／新） | 结果 |
|---|---|---|---:|---|
| `frames/PUBLIC-SURFACE-REAL-1-bound-1440x900.png` | `f05a3de1e662064d83d7b59a54e2c960e50b2d093aae01c0e72d87ca7f859215` | `f05a3de1e662064d83d7b59a54e2c960e50b2d093aae01c0e72d87ca7f859215` | 49759 / 49759 | identical |
| `frames/PUBLIC-SURFACE-REAL-1-proposal-1440x900.png` | `b55f50c010390dc917b1c52bce8ce2595b756bc989c9a5482dfb008a5dae9c20` | `b55f50c010390dc917b1c52bce8ce2595b756bc989c9a5482dfb008a5dae9c20` | 105527 / 105527 | identical |
| `frames/PUBLIC-SURFACE-REAL-1-viewer-1440x900.png` | `56fcf9c8c3d69313f7e53dba3763b22a9b9a0e0a06759321340159e98a6b6168` | `56fcf9c8c3d69313f7e53dba3763b22a9b9a0e0a06759321340159e98a6b6168` | 123160 / 123160 | identical |
| `assets/screenshots/PUBLIC-SURFACE-REAL-1-bound-1440.webp` | `ab9e8213f5e064df1d1a51af825a53e8505184f0d798a540b5543f0c8efd6cd7` | `ab9e8213f5e064df1d1a51af825a53e8505184f0d798a540b5543f0c8efd6cd7` | 15174 / 15174 | identical |
| `assets/screenshots/PUBLIC-SURFACE-REAL-1-bound-720.webp` | `9b73cd84c521d64378d0de090683ba6f376c747871b619d5c31a2f9f51dcea31` | `9b73cd84c521d64378d0de090683ba6f376c747871b619d5c31a2f9f51dcea31` | 4990 / 4990 | identical |
| `assets/screenshots/PUBLIC-SURFACE-REAL-1-proposal-1440.webp` | `0894773946eadcaab3bcda8b539cff81e86a44900827c887872ef57a28215a6d` | `0894773946eadcaab3bcda8b539cff81e86a44900827c887872ef57a28215a6d` | 34852 / 34852 | identical |
| `assets/screenshots/PUBLIC-SURFACE-REAL-1-proposal-720.webp` | `c236b3cca21c8ae1f7858919593b3727dbef32dba3e919b27e595c7cb166417d` | `c236b3cca21c8ae1f7858919593b3727dbef32dba3e919b27e595c7cb166417d` | 11804 / 11804 | identical |
| `assets/screenshots/PUBLIC-SURFACE-REAL-1-viewer-1440.webp` | `c9412b7aadcead26da03f5f5cd659ddba7df54238bc57dc1a28ddca8beb58aa6` | `c9412b7aadcead26da03f5f5cd659ddba7df54238bc57dc1a28ddca8beb58aa6` | 41814 / 41814 | identical |
| `assets/screenshots/PUBLIC-SURFACE-REAL-1-viewer-720.webp` | `54e3807bbf23fd6a54a72602ff063e175f82027d9414f1264fd2280e5dbdca0d` | `54e3807bbf23fd6a54a72602ff063e175f82027d9414f1264fd2280e5dbdca0d` | 14272 / 14272 | identical |

三态的含义仍然受限于 scripted GUI 的账本投影：绑定真实本地容器、写入提案等待人决定、
以及结果只读核验。三张源帧均不显示 `Pinned`、样板、`Owner`、`Sample lead` 或假成员，
底部只显示 `Local workspace`。`PI-BASE-GUI-ACCEPT` 的真实 DeepSeek、真实 Tauri WKWebView、
AX/键盘/读屏与焦点总验仍是独立 external gate，不能由本批帧外推。
