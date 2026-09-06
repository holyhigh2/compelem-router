import { CompElem, css, csscope, Csscope, h, prop, state, tag, Template } from 'compelem'
import { useRoute } from '../../src'
import type { Route } from '../../src/types'

/**
 * 多路由入口演示页：/status
 *
 * 页面上并存两个 outlet() 入口（见 AppComp）：
 *  - 主入口 outlet()            → entry = 'main'（默认）
 *  - 侧入口 outlet({entry:'side'}) → entry = 'side'
 *
 * 同一路由切换时两个入口会同时响应、各自实例化路由组件，
 * 组件通过入口注入的 entry prop 渲染不同内容——这就是
 * 「不同路由入口响应同一路由、显示不同内容」的演示本体。
 */
@tag('status-comp')
export class StatusComp extends CompElem {
  // 由所在入口注入：outlet({ entry: 'side' }) → 'side'，主入口为默认 'main'
  @prop({ type: String }) entry: string = 'main'

  @state route: Route = useRoute()

  private metrics = [
    { label: 'QPS', value: '1,284', trend: '+3.2%' },
    { label: 'P95 延迟', value: '86ms', trend: '-12ms' },
    { label: '在线连接', value: '5,702', trend: '+118' },
    { label: '错误率', value: '0.12%', trend: 'stable' },
  ]

  render(): Template {
    const isSide = this.entry === 'side'
    const badge = h`<span class="badge">入口: ${isSide ? 'side（侧）' : 'main（主）'}</span>`

    if (isSide) {
      // 侧入口：紧凑视图（只显示前两项指标）
      return h`
        <div class="compact">
          ${badge}
          <h3>状态 · 紧凑</h3>
          <ul>
            ${this.metrics.slice(0, 2).map((m) => h`<li><b>${m.label}</b> ${m.value} <i>${m.trend}</i></li>`)}
          </ul>
          <p class="hint">侧入口渲染的实例，与主入口实例相互独立</p>
        </div>
      `
    }

    // 主入口：完整视图（指标网格 + 说明）
    return h`
      <div class="full">
        ${badge}
        <h2>服务状态</h2>
        <p>
          本页由两个 <code>outlet()</code> 入口同时响应：主入口显示完整视图，
          侧入口传入 <code>{ entry: 'side' }</code> 显示紧凑视图。
          切换任意导航路由，两个入口会同时刷新。
        </p>
        <div class="grid">
          ${this.metrics.map((m) => h`
            <div class="metric">
              <span class="label">${m.label}</span>
              <span class="value">${m.value}</span>
              <span class="trend">${m.trend}</span>
            </div>
          `)}
        </div>
        <p class="hint">当前路由: <code>${this.route.path}</code> · 完整视图（entry=main）</p>
      </div>
    `
  }

  @csscope(Csscope.INNER)
  static get css() {
    return [css`
      :host { display: block; }
      .badge {
        display: inline-block;
        margin-bottom: 8px;
        padding: 2px 8px;
        border-radius: 999px;
        font-size: 11px;
        background: #ecfdf5;
        color: #047857;
        border: 1px solid #a7f3d0;
      }
      .compact { font-size: 13px; }
      .compact ul { margin: 6px 0; padding-left: 18px; }
      .compact i { color: #6b7280; font-style: normal; font-size: 11px; }
      .grid {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 8px;
        margin: 10px 0;
      }
      .metric {
        border: 1px solid #e5e7eb;
        border-radius: 8px;
        padding: 8px 10px;
        display: flex;
        flex-direction: column;
        gap: 2px;
      }
      .metric .label { font-size: 11px; color: #6b7280; }
      .metric .value { font-size: 17px; font-weight: 600; color: #1f2937; }
      .metric .trend { font-size: 11px; color: #059669; }
      .hint { color: #9ca3af; font-size: 11px; }
      .hint code { background: #f3f4f6; padding: 1px 5px; border-radius: 4px; }
    `]
  }
}
