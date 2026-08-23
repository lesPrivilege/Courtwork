import { customIcons, type CustomIconName } from '../icons/custom-icons.generated';

/**
 * Agent/Pi Work 的动作图标适配层。
 *
 * 动作按钮只消费登记过的 custom SVG；几何仍由 SVG 源稿 → manifest → generated module
 * 链路提供，Pi 面不复制路径，也不把通用图标表带进动作语义。
 */
export function PiActionIcon({ name }: { name: CustomIconName }) {
  const Icon = customIcons[name];
  return <Icon className="pi-action-icon" data-icon-name={name} aria-hidden="true" focusable="false" />;
}
