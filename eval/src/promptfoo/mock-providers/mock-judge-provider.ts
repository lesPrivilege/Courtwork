/**
 * llm-rubric 断言本身会把 rubric 评分提示词发给"评分 provider"，期望收到一段能解析成
 * {reason, score, pass} 的文本。本机没有真实 provider key，这个 mock 判官只返回一个固定的、
 * 形状合法的评分结果，用来验证"judge 这条链路本身接得通"，分数不代表任何真实评估——
 * 真实跑分时把 promptfooconfig.yaml 里 defaultTest.options.provider 换成真实 provider id。
 */
export default class MockJudgeProvider {
  id = () => 'mock-judge';

  async callApi() {
    return {
      output: JSON.stringify({
        pass: true,
        score: 0.85,
        reason: '(mock judge：仅验证 llm-rubric 链路可跑通，非真实评分，不代表任何模型的实际质量)',
      }),
    };
  }
}
