export class ProviderNotConfiguredError extends Error {
  constructor(
    public readonly providerId: string,
    message: string,
  ) {
    super(message);
    this.name = 'ProviderNotConfiguredError';
    Object.setPrototypeOf(this, ProviderNotConfiguredError.prototype);
  }
}

export class ProviderAuthError extends Error {
  constructor(
    public readonly providerId: string,
    public readonly status: number,
  ) {
    super(`provider "${providerId}" 鉴权失败（HTTP ${status}）：请检查配置注入的 apiKey 是否正确`);
    this.name = 'ProviderAuthError';
    Object.setPrototypeOf(this, ProviderAuthError.prototype);
  }
}

export class ProviderTimeoutError extends Error {
  constructor(
    public readonly providerId: string,
    public readonly timeoutMs: number,
  ) {
    super(`provider "${providerId}" 在 ${timeoutMs}ms 内未返回结果，判定超时`);
    this.name = 'ProviderTimeoutError';
    Object.setPrototypeOf(this, ProviderTimeoutError.prototype);
  }
}

export class ProviderHttpError extends Error {
  constructor(
    public readonly providerId: string,
    public readonly status: number,
    bodyText: string,
  ) {
    super(`provider "${providerId}" 返回 HTTP ${status}：${bodyText.slice(0, 500)}`);
    this.name = 'ProviderHttpError';
    Object.setPrototypeOf(this, ProviderHttpError.prototype);
  }
}

/** 已知/疑似"provider 静默忽略 response_format"时拒绝调用——反静默降级哲学，MiniMax 判例
 * （docs/architecture/system.md：主力模型对 response_format 完全不支持且静默忽略参数，不报错、模型直接吐自由文本）。 */
export class ProviderResponseFormatUnsupportedError extends Error {
  constructor(
    public readonly providerId: string,
    public readonly modelId: string,
  ) {
    super(
      `provider "${providerId}"（模型 "${modelId}"）的 response_format 已知会被静默忽略：拒绝在需要结构化输出的场景下调用，` +
        `需先解决兼容性缺口或更换 provider/模型，不允许静默退化为自由文本再假装校验通过。`,
    );
    this.name = 'ProviderResponseFormatUnsupportedError';
    Object.setPrototypeOf(this, ProviderResponseFormatUnsupportedError.prototype);
  }
}

/**
 * 结构化输出重试耗尽后的终态失败——语义上对应 @courtwork/tools 六种降级 reason 里的
 * 'invalid_response'（docs/architecture/principles.md 静默降级零容忍）：显式抛出、
 * 不静默降级、不插入占位数据。这里选择本地字面量类型而非跨包导入 ToolFailureReasonEnum——
 * provider 生成失败不是 ToolEnvelope，语义呼应但不是同一个判别联合的成员。
 */
export class ProviderInvalidResponseError extends Error {
  readonly reason = 'invalid_response' as const;
  constructor(
    public readonly providerId: string,
    public readonly attempts: number,
    public readonly lastIssue: string,
    /** true 代表全部尝试都没能返回哪怕语法合法的 JSON——疑似 provider 静默忽略了
     * response_format 约束（而非模型偶发内容错误），值得核实是否要把该 provider/模型组合
     * 加入已知不兼容名单（quirk-profile.ts 的 tier:'unsupported'）。 */
    public readonly suspectedSilentParamSwallow: boolean,
  ) {
    super(
      `provider "${providerId}" 结构化输出在 ${attempts} 次尝试后仍未通过 schema 校验：${lastIssue}` +
        (suspectedSilentParamSwallow
          ? '（全部尝试均未返回语法合法的 JSON——疑似 provider 静默忽略了 response_format 约束，建议核实是否需要加入已知不兼容名单）'
          : ''),
    );
    this.name = 'ProviderInvalidResponseError';
    Object.setPrototypeOf(this, ProviderInvalidResponseError.prototype);
  }
}

/** 已声明但尚未实现的判别分支（如 auth.kind:'oauth_subscription'、billing.kind:'plan'）
 * 触发时抛出——语义上对应 @courtwork/tools 的 ToolNotImplementedError（真实适配器骨架
 * 尚未接入请求/响应逻辑），与"缺少配置"（ProviderNotConfiguredError）是两回事：调用方
 * 需要知道"这个功能还没做"而不是"你少填了什么"，才能给出正确的用户提示。 */
export class ProviderNotImplementedError extends Error {
  constructor(
    public readonly providerId: string,
    message: string,
  ) {
    super(message);
    this.name = 'ProviderNotImplementedError';
    Object.setPrototypeOf(this, ProviderNotImplementedError.prototype);
  }
}
