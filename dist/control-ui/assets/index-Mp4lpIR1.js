import{f as ge,u as ue,i as p,a as v,b as n,r as Z,c as j,e as he}from"./vendor-lit-519uE-6n.js";import{i as me,L as Y}from"./vendor-echarts-ClnnwaJ7.js";(function(){const t=document.createElement("link").relList;if(t&&t.supports&&t.supports("modulepreload"))return;for(const r of document.querySelectorAll('link[rel="modulepreload"]'))i(r);new MutationObserver(r=>{for(const s of r)if(s.type==="childList")for(const o of s.addedNodes)o.tagName==="LINK"&&o.rel==="modulepreload"&&i(o)}).observe(document,{childList:!0,subtree:!0});function a(r){const s={};return r.integrity&&(s.integrity=r.integrity),r.referrerPolicy&&(s.referrerPolicy=r.referrerPolicy),r.crossOrigin==="use-credentials"?s.credentials="include":r.crossOrigin==="anonymous"?s.credentials="omit":s.credentials="same-origin",s}function i(r){if(r.ep)return;r.ep=!0;const s=a(r);fetch(r.href,s)}})();const be="modulepreload",fe=function(e,t){return new URL(e,t).href},se={},ye=function(t,a,i){let r=Promise.resolve();if(a&&a.length>0){let ve=function(u){return Promise.all(u.map(x=>Promise.resolve(x).then(D=>({status:"fulfilled",value:D}),D=>({status:"rejected",reason:D}))))};const o=document.getElementsByTagName("link"),l=document.querySelector("meta[property=csp-nonce]"),_=l?.nonce||l?.getAttribute("nonce");r=ve(a.map(u=>{if(u=fe(u,i),u in se)return;se[u]=!0;const x=u.endsWith(".css"),D=x?'[rel="stylesheet"]':"";if(i)for(let P=o.length-1;P>=0;P--){const N=o[P];if(N.href===u&&(!x||N.rel==="stylesheet"))return}else if(document.querySelector(`link[href="${u}"]${D}`))return;const m=document.createElement("link");if(m.rel=x?"stylesheet":be,x||(m.as="script"),m.crossOrigin="",m.href=u,_&&m.setAttribute("nonce",_),document.head.appendChild(m),x)return new Promise((P,N)=>{m.addEventListener("load",P),m.addEventListener("error",()=>N(new Error(`Unable to preload CSS for ${u}`)))})}))}function s(o){const l=new Event("vite:preloadError",{cancelable:!0});if(l.payload=o,window.dispatchEvent(l),!l.defaultPrevented)throw o}return r.then(o=>{for(const l of o||[])l.status==="rejected"&&s(l.reason);return t().catch(s)})};const g=e=>(t,a)=>{a!==void 0?a.addInitializer(()=>{customElements.define(e,t)}):customElements.define(e,t)};const xe={attribute:!0,type:String,converter:ue,reflect:!1,hasChanged:ge},we=(e=xe,t,a)=>{const{kind:i,metadata:r}=a;let s=globalThis.litPropertyMetadata.get(r);if(s===void 0&&globalThis.litPropertyMetadata.set(r,s=new Map),i==="setter"&&((e=Object.create(e)).wrapped=!0),s.set(a.name,e),i==="accessor"){const{name:o}=a;return{set(l){const _=t.get.call(this);t.set.call(this,l),this.requestUpdate(o,_,e,!0,l)},init(l){return l!==void 0&&this.C(o,void 0,e,l),l}}}if(i==="setter"){const{name:o}=a;return function(l){const _=this[o];t.call(this,l),this.requestUpdate(o,_,e,!0,l)}}throw Error("Unsupported decorator location: "+i)};function h(e){return(t,a)=>typeof a=="object"?we(e,t,a):((i,r,s)=>{const o=r.hasOwnProperty(s);return r.constructor.createProperty(s,i),o?Object.getOwnPropertyDescriptor(r,s):void 0})(e,t,a)}function c(e){return h({...e,state:!0,attribute:!1})}const _e=(e,t,a)=>(a.configurable=!0,a.enumerable=!0,Reflect.decorate&&typeof t!="object"&&Object.defineProperty(e,t,a),a);function ke(e,t){return(a,i,r)=>{const s=o=>o.renderRoot?.querySelector(e)??null;return _e(a,i,{get(){return s(this)}})}}var $e=Object.getOwnPropertyDescriptor,Se=(e,t,a,i)=>{for(var r=i>1?void 0:i?$e(t,a):t,s=e.length-1,o;s>=0;s--)(o=e[s])&&(r=o(r)||r);return r};let J=class extends v{render(){return n`
      <slot></slot>
    `}};J.styles=p`
    :host {
      display: flex;
      flex-direction: column;
      min-height: 100vh;
    }

    ::slotted(*) {
      flex: 1;
    }
  `;J=Se([g("sc-layout")],J);var Ce=Object.getOwnPropertyDescriptor,ze=(e,t,a,i)=>{for(var r=i>1?void 0:i?Ce(t,a):t,s=e.length-1,o;s>=0;s--)(o=e[s])&&(r=o(r)||r);return r};let Q=class extends v{_toggleMenu(){this.dispatchEvent(new CustomEvent("toggle-sidebar",{bubbles:!0}))}render(){return n`
      <header>
        <div class="logo">
          <button class="menu-btn" @click=${this._toggleMenu}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M3 12h18M3 6h18M3 18h18"/>
            </svg>
          </button>
          <img src="./favicon.svg" alt="SecuClaw" class="logo-icon" />
          <div>
            <div class="logo-text">SecuClaw</div>
            <div class="logo-subtitle">安爪安全控制台</div>
          </div>
        </div>

        <div class="actions">
          <div class="status-badge">
            <span class="status-dot"></span>
            系统运行中
          </div>

          <div class="user-menu">
            <div class="user-avatar">管</div>
          </div>
        </div>
      </header>
    `}};Q.styles=p`
    :host {
      display: block;
    }

    header {
      height: var(--header-height);
      background: var(--bg-secondary);
      border-bottom: 1px solid var(--border-color);
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 var(--spacing-lg);
    }

    .logo {
      display: flex;
      align-items: center;
      gap: var(--spacing-md);
    }

    .logo-icon {
      width: 32px;
      height: 32px;
    }

    .logo-text {
      font-size: 1.25rem;
      font-weight: 600;
      color: var(--text-primary);
    }

    .logo-subtitle {
      font-size: 0.75rem;
      color: var(--text-muted);
    }

    .menu-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 40px;
      height: 40px;
      border-radius: var(--border-radius);
      background: transparent;
      color: var(--text-secondary);
      transition: all var(--transition-fast);
    }

    .menu-btn:hover {
      background: var(--bg-hover);
      color: var(--text-primary);
    }

    .actions {
      display: flex;
      align-items: center;
      gap: var(--spacing-md);
    }

    .status-badge {
      display: flex;
      align-items: center;
      gap: var(--spacing-xs);
      padding: var(--spacing-xs) var(--spacing-sm);
      background: rgba(16, 185, 129, 0.1);
      border-radius: 9999px;
      font-size: 0.75rem;
      color: var(--color-success);
    }

    .status-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: var(--color-success);
    }

    .user-menu {
      display: flex;
      align-items: center;
      gap: var(--spacing-sm);
      padding: var(--spacing-xs) var(--spacing-sm);
      border-radius: var(--border-radius);
      cursor: pointer;
      transition: background var(--transition-fast);
    }

    .user-menu:hover {
      background: var(--bg-hover);
    }

    .user-avatar {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      background: var(--color-primary);
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-size: 0.875rem;
      font-weight: 600;
    }
  `;Q=ze([g("sc-header")],Q);var Me=Object.defineProperty,De=Object.getOwnPropertyDescriptor,ee=(e,t,a,i)=>{for(var r=i>1?void 0:i?De(t,a):t,s=e.length-1,o;s>=0;s--)(o=e[s])&&(r=(i?o(t,a,r):o(r))||r);return i&&r&&Me(t,a,r),r};const Pe=[{id:"dashboard",label:"仪表盘",icon:"grid"},{id:"threats",label:"威胁情报",icon:"alert-triangle",badge:3},{id:"incidents",label:"安全事件",icon:"file-warning"},{id:"vulnerabilities",label:"漏洞管理",icon:"bug",badge:12},{id:"compliance",label:"合规审计",icon:"clipboard-check"},{id:"reports",label:"分析报告",icon:"bar-chart"},{id:"settings",label:"系统设置",icon:"settings"}];let A=class extends v{constructor(){super(...arguments),this.collapsed=!1,this.activeItem="dashboard"}_handleNavClick(e){this.activeItem=e.id,this.dispatchEvent(new CustomEvent("nav-change",{detail:{item:e},bubbles:!0}))}_renderIcon(e){const t={grid:"M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z","alert-triangle":"M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0zM12 9v4M12 17h.01","file-warning":"M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z M12 9v4 M12 17h.01",bug:"M8 2l1.88 1.88M14.12 3.88L16 2M9 22v-4.5M15 22v-4.5M12 12v6","clipboard-check":"M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2 M9 14l2 2 4-4","bar-chart":"M12 20V10M18 20V4M6 20v-4",settings:"M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"},a=t[e]||t.grid;return n`
      <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d=${a}/>
      </svg>
    `}render(){return n`
      <nav>
        <div class="nav-section">
          <div class="nav-section-title">导航菜单</div>
          ${Pe.map(e=>n`
            <div class="nav-item-wrapper">
              <div 
                class="nav-item ${this.activeItem===e.id?"active":""}"
                @click=${()=>this._handleNavClick(e)}
              >
                ${this._renderIcon(e.icon)}
                <span class="nav-label">${e.label}</span>
                ${e.badge?n`<span class="nav-badge">${e.badge}</span>`:""}
              </div>
            </div>
          `)}
        </div>
      </nav>
    `}};A.styles=p`
    :host {
      display: block;
      width: var(--sidebar-width);
      background: var(--bg-secondary);
      border-right: 1px solid var(--border-color);
      transition: width var(--transition-normal);
      overflow: hidden;
    }

    :host([collapsed]) {
      width: 64px;
    }

    nav {
      padding: var(--spacing-md);
    }

    .nav-section {
      margin-bottom: var(--spacing-lg);
    }

    .nav-section-title {
      font-size: 0.625rem;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      color: var(--text-muted);
      padding: var(--spacing-sm) var(--spacing-md);
      white-space: nowrap;
      overflow: hidden;
    }

    :host([collapsed]) .nav-section-title {
      opacity: 0;
    }

    .nav-item {
      display: flex;
      align-items: center;
      gap: var(--spacing-md);
      padding: var(--spacing-sm) var(--spacing-md);
      border-radius: var(--border-radius);
      color: var(--text-secondary);
      cursor: pointer;
      transition: all var(--transition-fast);
      white-space: nowrap;
    }

    .nav-item:hover {
      background: var(--bg-hover);
      color: var(--text-primary);
    }

    .nav-item.active {
      background: rgba(59, 130, 246, 0.1);
      color: var(--color-primary);
    }

    .nav-icon {
      width: 20px;
      height: 20px;
      flex-shrink: 0;
    }

    .nav-label {
      flex: 1;
      font-size: 0.875rem;
    }

    :host([collapsed]) .nav-label {
      opacity: 0;
      width: 0;
    }

    .nav-badge {
      background: var(--color-danger);
      color: white;
      font-size: 0.625rem;
      font-weight: 600;
      padding: 2px 6px;
      border-radius: 9999px;
      min-width: 18px;
      text-align: center;
    }

    :host([collapsed]) .nav-badge {
      position: absolute;
      top: 4px;
      right: 4px;
      font-size: 0.5rem;
      padding: 1px 4px;
    }

    .nav-item-wrapper {
      position: relative;
    }
  `;ee([h({type:Boolean,reflect:!0})],A.prototype,"collapsed",2);ee([h({type:String})],A.prototype,"activeItem",2);A=ee([g("sc-sidebar")],A);var Te=Object.defineProperty,Ae=Object.getOwnPropertyDescriptor,C=(e,t,a,i)=>{for(var r=i>1?void 0:i?Ae(t,a):t,s=e.length-1,o;s>=0;s--)(o=e[s])&&(r=(i?o(t,a,r):o(r))||r);return i&&r&&Te(t,a,r),r};let b=class extends v{constructor(){super(...arguments),this.title="",this.value="",this.trend="",this.icon="activity",this.color="primary"}_getIconPath(e){const t={"alert-triangle":"M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0zM12 9v4M12 17h.01","file-warning":"M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z",bug:"M8 2l1.88 1.88M14.12 3.88L16 2","clipboard-check":"M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2 M9 14l2 2 4-4",activity:"M22 12h-4l-3 9L9 3l-3 9H2"};return t[e]||t.activity}_isTrendUp(){return this.trend.startsWith("+")}render(){return n`
      <div class="card">
        <div class="card-header">
          <span class="card-title">${this.title}</span>
          <div class="card-icon ${this.color}">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d=${this._getIconPath(this.icon)}/>
            </svg>
          </div>
        </div>
        <div class="card-value">${this.value}</div>
        <div class="card-trend ${this._isTrendUp()?"trend-up":"trend-down"}">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            ${this._isTrendUp()?n`<path d="M18 15l-6-6-6 6"/>`:n`<path d="M6 9l6 6 6-6"/>`}
          </svg>
          ${this.trend} 较上周
        </div>
      </div>
    `}};b.styles=p`
    :host {
      display: block;
    }

    .card {
      background: var(--bg-card);
      border: 1px solid var(--border-color);
      border-radius: var(--border-radius);
      padding: var(--spacing-lg);
      transition: all var(--transition-fast);
    }

    .card:hover {
      border-color: var(--color-primary);
      transform: translateY(-2px);
    }

    .card-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: var(--spacing-md);
    }

    .card-title {
      font-size: 0.875rem;
      color: var(--text-secondary);
    }

    .card-icon {
      width: 40px;
      height: 40px;
      border-radius: var(--border-radius);
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .card-icon svg {
      width: 20px;
      height: 20px;
    }

    .card-icon.primary { background: rgba(59, 130, 246, 0.1); color: var(--color-primary); }
    .card-icon.success { background: rgba(16, 185, 129, 0.1); color: var(--color-success); }
    .card-icon.warning { background: rgba(245, 158, 11, 0.1); color: var(--color-warning); }
    .card-icon.danger { background: rgba(239, 68, 68, 0.1); color: var(--color-danger); }
    .card-icon.info { background: rgba(6, 182, 212, 0.1); color: var(--color-info); }

    .card-value {
      font-size: 2rem;
      font-weight: 700;
      margin-bottom: var(--spacing-xs);
    }

    .card-trend {
      display: flex;
      align-items: center;
      gap: var(--spacing-xs);
      font-size: 0.75rem;
    }

    .trend-up { color: var(--color-success); }
    .trend-down { color: var(--color-danger); }
  `;C([h({type:String})],b.prototype,"title",2);C([h({type:String})],b.prototype,"value",2);C([h({type:String})],b.prototype,"trend",2);C([h({type:String})],b.prototype,"icon",2);C([h({type:String})],b.prototype,"color",2);b=C([g("sc-stats-card")],b);var Oe=Object.defineProperty,Le=Object.getOwnPropertyDescriptor,ce=(e,t,a,i)=>{for(var r=i>1?void 0:i?Le(t,a):t,s=e.length-1,o;s>=0;s--)(o=e[s])&&(r=(i?o(t,a,r):o(r))||r);return i&&r&&Oe(t,a,r),r};let F=class extends v{constructor(){super(...arguments),this._threats=[{id:"1",name:"APT28 钓鱼攻击活动",severity:"critical",source:"威胁情报源",time:"5分钟前"},{id:"2",name:"CVE-2024-1234 漏洞利用",severity:"high",source:"漏洞扫描",time:"15分钟前"},{id:"3",name:"异常登录行为检测",severity:"medium",source:"SIEM",time:"1小时前"},{id:"4",name:"恶意软件签名更新",severity:"low",source:"防病毒系统",time:"2小时前"},{id:"5",name:"DDoS 攻击预警",severity:"high",source:"网络监控",time:"3小时前"}]}_getSeverityLabel(e){return{critical:"严重",high:"高",medium:"中",low:"低"}[e]||e}render(){return this._threats.length===0?n`
        <div class="empty-state">
          暂无威胁数据
        </div>
      `:n`
      <div class="threat-list">
        ${this._threats.map(e=>n`
          <div class="threat-item">
            <div class="severity-indicator severity-${e.severity}"></div>
            <div class="threat-info">
              <div class="threat-name">${e.name}</div>
              <div class="threat-meta">
                <span>${e.source}</span>
                <span>•</span>
                <span>${e.time}</span>
              </div>
            </div>
            <span class="severity-badge ${e.severity}">
              ${this._getSeverityLabel(e.severity)}
            </span>
          </div>
        `)}
      </div>
    `}};F.styles=p`
    :host {
      display: block;
    }

    .threat-list {
      display: flex;
      flex-direction: column;
      gap: var(--spacing-sm);
    }

    .threat-item {
      display: flex;
      align-items: center;
      gap: var(--spacing-md);
      padding: var(--spacing-sm);
      border-radius: var(--border-radius);
      transition: background var(--transition-fast);
      cursor: pointer;
    }

    .threat-item:hover {
      background: var(--bg-hover);
    }

    .severity-indicator {
      width: 4px;
      height: 40px;
      border-radius: 2px;
    }

    .severity-critical { background: var(--color-danger); }
    .severity-high { background: var(--color-warning); }
    .severity-medium { background: var(--color-info); }
    .severity-low { background: var(--color-success); }

    .threat-info {
      flex: 1;
      min-width: 0;
    }

    .threat-name {
      font-size: 0.875rem;
      font-weight: 500;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .threat-meta {
      font-size: 0.75rem;
      color: var(--text-muted);
      display: flex;
      gap: var(--spacing-sm);
    }

    .severity-badge {
      font-size: 0.625rem;
      text-transform: uppercase;
      padding: 2px 6px;
      border-radius: 4px;
    }

    .severity-badge.critical { background: rgba(239, 68, 68, 0.2); color: var(--color-danger); }
    .severity-badge.high { background: rgba(245, 158, 11, 0.2); color: var(--color-warning); }
    .severity-badge.medium { background: rgba(6, 182, 212, 0.2); color: var(--color-info); }
    .severity-badge.low { background: rgba(16, 185, 129, 0.2); color: var(--color-success); }

    .empty-state {
      text-align: center;
      padding: var(--spacing-xl);
      color: var(--text-muted);
    }
  `;ce([c()],F.prototype,"_threats",2);F=ce([g("sc-threat-list")],F);var Ie=Object.defineProperty,Ee=Object.getOwnPropertyDescriptor,te=(e,t,a,i)=>{for(var r=i>1?void 0:i?Ee(t,a):t,s=e.length-1,o;s>=0;s--)(o=e[s])&&(r=(i?o(t,a,r):o(r))||r);return i&&r&&Ie(t,a,r),r};let O=class extends v{constructor(){super(...arguments),this.data={dates:[],threats:[],incidents:[],vulnerabilities:[]},this._chart=null,this._handleResize=()=>{this._chart?.resize()}}connectedCallback(){super.connectedCallback(),this.data.dates.length===0&&(this.data=this._generateMockData())}disconnectedCallback(){super.disconnectedCallback(),this._chart?.dispose()}firstUpdated(e){this._initChart(),window.addEventListener("resize",this._handleResize)}updated(e){e.has("data")&&this._updateChart()}_generateMockData(){const e=[],t=[],a=[],i=[],r=new Date;for(let s=6;s>=0;s--){const o=new Date(r);o.setDate(o.getDate()-s),e.push(o.toLocaleDateString("zh-CN",{month:"short",day:"numeric"})),t.push(Math.floor(Math.random()*50)+20),a.push(Math.floor(Math.random()*20)+5),i.push(Math.floor(Math.random()*30)+10)}return{dates:e,threats:t,incidents:a,vulnerabilities:i}}_initChart(){this._chartContainer&&(this._chart=me(this._chartContainer,"dark"),this._updateChart())}_updateChart(){if(!this._chart)return;const e={backgroundColor:"transparent",tooltip:{trigger:"axis",backgroundColor:"rgba(30, 41, 59, 0.9)",borderColor:"#334155",textStyle:{color:"#f8fafc"}},legend:{data:["威胁情报","安全事件","漏洞"],textStyle:{color:"#94a3b8"},top:0},grid:{left:"3%",right:"4%",bottom:"3%",top:"15%",containLabel:!0},xAxis:{type:"category",boundaryGap:!1,data:this.data.dates,axisLine:{lineStyle:{color:"#334155"}},axisLabel:{color:"#64748b"}},yAxis:{type:"value",axisLine:{lineStyle:{color:"#334155"}},axisLabel:{color:"#64748b"},splitLine:{lineStyle:{color:"#334155",type:"dashed"}}},series:[{name:"威胁情报",type:"line",smooth:!0,data:this.data.threats,lineStyle:{color:"#f59e0b",width:2},itemStyle:{color:"#f59e0b"},areaStyle:{color:new Y(0,0,0,1,[{offset:0,color:"rgba(245, 158, 11, 0.3)"},{offset:1,color:"rgba(245, 158, 11, 0)"}])}},{name:"安全事件",type:"line",smooth:!0,data:this.data.incidents,lineStyle:{color:"#ef4444",width:2},itemStyle:{color:"#ef4444"},areaStyle:{color:new Y(0,0,0,1,[{offset:0,color:"rgba(239, 68, 68, 0.3)"},{offset:1,color:"rgba(239, 68, 68, 0)"}])}},{name:"漏洞",type:"line",smooth:!0,data:this.data.vulnerabilities,lineStyle:{color:"#06b6d4",width:2},itemStyle:{color:"#06b6d4"},areaStyle:{color:new Y(0,0,0,1,[{offset:0,color:"rgba(6, 182, 212, 0.3)"},{offset:1,color:"rgba(6, 182, 212, 0)"}])}}]};this._chart.setOption(e)}render(){return n`
      <div class="chart-container"></div>
    `}};O.styles=p`
    :host {
      display: block;
    }

    .chart-container {
      height: 300px;
      width: 100%;
    }
  `;te([ke(".chart-container")],O.prototype,"_chartContainer",2);te([h({type:Object})],O.prototype,"data",2);O=te([g("sc-chart-panel")],O);var je=Object.defineProperty,Re=Object.getOwnPropertyDescriptor,re=(e,t,a,i)=>{for(var r=i>1?void 0:i?Re(t,a):t,s=e.length-1,o;s>=0;s--)(o=e[s])&&(r=(i?o(t,a,r):o(r))||r);return i&&r&&je(t,a,r),r};let L=class extends v{constructor(){super(...arguments),this._stats={totalThreats:156,activeIncidents:8,vulnerabilities:42,complianceScore:94},this._lastUpdate=new Date}render(){return n`
      <div class="dashboard-header">
        <h1 class="dashboard-title">安全仪表盘</h1>
        <p class="dashboard-subtitle">
          最后更新: ${this._lastUpdate.toLocaleString("zh-CN")}
        </p>
      </div>

      <!-- Stats Cards -->
      <div class="stats-grid">
        <sc-stats-card
          title="威胁情报"
          value=${this._stats.totalThreats}
          trend="+12"
          icon="alert-triangle"
          color="warning"
        ></sc-stats-card>

        <sc-stats-card
          title="活跃事件"
          value=${this._stats.activeIncidents}
          trend="-3"
          icon="file-warning"
          color="danger"
        ></sc-stats-card>

        <sc-stats-card
          title="漏洞数量"
          value=${this._stats.vulnerabilities}
          trend="-8"
          icon="bug"
          color="info"
        ></sc-stats-card>

        <sc-stats-card
          title="合规评分"
          value="${this._stats.complianceScore}%"
          trend="+2"
          icon="clipboard-check"
          color="success"
        ></sc-stats-card>
      </div>

      <!-- Content Grid -->
      <div class="content-grid">
        <!-- Chart Panel -->
        <div class="panel">
          <div class="panel-header">
            <h2 class="panel-title">威胁趋势</h2>
            <span class="panel-action">查看详情</span>
          </div>
          <sc-chart-panel></sc-chart-panel>
        </div>

        <!-- Recent Threats -->
        <div class="panel">
          <div class="panel-header">
            <h2 class="panel-title">最新威胁</h2>
            <span class="panel-action">查看全部</span>
          </div>
          <sc-threat-list></sc-threat-list>
        </div>
      </div>
    `}};L.styles=p`
    :host {
      display: block;
    }

    .dashboard-header {
      margin-bottom: var(--spacing-xl);
    }

    .dashboard-title {
      font-size: 1.5rem;
      font-weight: 600;
      margin-bottom: var(--spacing-xs);
    }

    .dashboard-subtitle {
      color: var(--text-muted);
      font-size: 0.875rem;
    }

    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
      gap: var(--spacing-md);
      margin-bottom: var(--spacing-xl);
    }

    .content-grid {
      display: grid;
      grid-template-columns: 2fr 1fr;
      gap: var(--spacing-lg);
    }

    @media (max-width: 1024px) {
      .content-grid {
        grid-template-columns: 1fr;
      }
    }

    .panel {
      background: var(--bg-card);
      border: 1px solid var(--border-color);
      border-radius: var(--border-radius);
      padding: var(--spacing-lg);
    }

    .panel-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: var(--spacing-md);
    }

    .panel-title {
      font-size: 1rem;
      font-weight: 600;
    }

    .panel-action {
      font-size: 0.75rem;
      color: var(--color-primary);
      cursor: pointer;
    }

    .panel-action:hover {
      color: var(--color-primary-light);
    }
  `;re([c()],L.prototype,"_stats",2);re([c()],L.prototype,"_lastUpdate",2);L=re([g("sc-dashboard")],L);var Ne=Object.defineProperty,Ve=Object.getOwnPropertyDescriptor,le=(e,t,a,i)=>{for(var r=i>1?void 0:i?Ve(t,a):t,s=e.length-1,o;s>=0;s--)(o=e[s])&&(r=(i?o(t,a,r):o(r))||r);return i&&r&&Ne(t,a,r),r};const Be=new Map;let B=null;function He(e){Be.delete(e),B?.removeNotification(e)}let W=class extends v{constructor(){super(...arguments),this._notifications=[]}connectedCallback(){super.connectedCallback(),B=this}disconnectedCallback(){super.disconnectedCallback(),B===this&&(B=null)}addNotification(e){this._notifications=[...this._notifications,e]}removeNotification(e){const t=this.shadowRoot?.querySelector(`[data-id="${e}"]`);t?(t.classList.add("removing"),setTimeout(()=>{this._notifications=this._notifications.filter(a=>a.id!==e)},300)):this._notifications=this._notifications.filter(a=>a.id!==e)}clearAll(){this._notifications=[]}_getIcon(e){const t={info:"M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z",success:"M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z",warning:"M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z",error:"M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"};return t[e]||t.info}render(){return n`
      ${this._notifications.map(e=>n`
        <div class="notification ${e.type}" data-id=${e.id}>
          <svg class="notification-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d=${this._getIcon(e.type)}/>
          </svg>
          <div class="notification-content">
            <div class="notification-title">${e.title}</div>
            ${e.message?n`<div class="notification-message">${e.message}</div>`:""}
          </div>
          <button class="notification-close" @click=${()=>He(e.id)}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>
      `)}
    `}};W.styles=p`
    :host {
      position: fixed;
      top: calc(var(--header-height) + var(--spacing-md));
      right: var(--spacing-md);
      z-index: 1000;
      display: flex;
      flex-direction: column;
      gap: var(--spacing-sm);
      max-width: 400px;
      pointer-events: none;
    }

    .notification {
      background: var(--bg-secondary);
      border: 1px solid var(--border-color);
      border-radius: var(--border-radius);
      padding: var(--spacing-md);
      display: flex;
      gap: var(--spacing-md);
      animation: slideIn 0.3s ease;
      pointer-events: auto;
      box-shadow: var(--shadow-lg);
    }

    .notification.removing {
      animation: slideOut 0.3s ease forwards;
    }

    @keyframes slideIn {
      from {
        transform: translateX(100%);
        opacity: 0;
      }
      to {
        transform: translateX(0);
        opacity: 1;
      }
    }

    @keyframes slideOut {
      from {
        transform: translateX(0);
        opacity: 1;
      }
      to {
        transform: translateX(100%);
        opacity: 0;
      }
    }

    .notification-icon {
      width: 24px;
      height: 24px;
      flex-shrink: 0;
    }

    .notification-content {
      flex: 1;
      min-width: 0;
    }

    .notification-title {
      font-weight: 600;
      font-size: 0.875rem;
      margin-bottom: var(--spacing-xs);
    }

    .notification-message {
      font-size: 0.75rem;
      color: var(--text-secondary);
    }

    .notification-close {
      background: none;
      border: none;
      color: var(--text-muted);
      cursor: pointer;
      padding: 0;
      width: 20px;
      height: 20px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .notification-close:hover {
      color: var(--text-primary);
    }

    /* Type colors */
    .notification.info { border-left: 3px solid var(--color-info); }
    .notification.success { border-left: 3px solid var(--color-success); }
    .notification.warning { border-left: 3px solid var(--color-warning); }
    .notification.error { border-left: 3px solid var(--color-danger); }

    .notification.info .notification-icon { color: var(--color-info); }
    .notification.success .notification-icon { color: var(--color-success); }
    .notification.warning .notification-icon { color: var(--color-warning); }
    .notification.error .notification-icon { color: var(--color-danger); }
  `;le([c()],W.prototype,"_notifications",2);W=le([g("sc-notifications")],W);const d=Z({isAuthenticated:!1,user:null,token:null,loading:!1,error:null});j(()=>d.get().isAuthenticated);j(()=>d.get().user);j(()=>d.get().loading);j(()=>d.get().error);const T={getState:()=>d.get(),login:async(e,t)=>{d.set({...d.get(),loading:!0,error:null});try{if(await new Promise(a=>setTimeout(a,1e3)),e==="admin"&&t==="admin123"){const a={id:"1",username:"admin",email:"admin@secuclaw.local",role:"admin",permissions:["read","write","delete","admin"],avatar:void 0};return d.set({isAuthenticated:!0,user:a,token:"mock-jwt-token-"+Date.now(),loading:!1,error:null}),localStorage.setItem("secuclaw_token",d.get().token),!0}else return d.set({...d.get(),loading:!1,error:"用户名或密码错误"}),!1}catch{return d.set({...d.get(),loading:!1,error:"登录失败，请稍后重试"}),!1}},logout:()=>{localStorage.removeItem("secuclaw_token"),d.set({isAuthenticated:!1,user:null,token:null,loading:!1,error:null})},checkAuth:async()=>{const e=localStorage.getItem("secuclaw_token");return e?(d.set({...d.get(),token:e,isAuthenticated:!0,user:{id:"1",username:"admin",email:"admin@secuclaw.local",role:"admin",permissions:["read","write","delete","admin"]}}),!0):!1},clearError:()=>{d.set({...d.get(),error:null})},hasPermission:e=>{const t=d.get().user;return t?t.permissions.includes(e)||t.role==="admin":!1}},V=[{path:"/login",component:"sc-login-page",title:"登录"},{path:"/",component:"sc-dashboard",title:"仪表盘"},{path:"/threats",component:"sc-threats-page",title:"威胁情报"},{path:"/threats/:id",component:"sc-threat-detail",title:"威胁详情"},{path:"/incidents",component:"sc-incidents-page",title:"安全事件"},{path:"/vulnerabilities",component:"sc-vulnerabilities-page",title:"漏洞管理"},{path:"/compliance",component:"sc-compliance-page",title:"合规审计"},{path:"/reports",component:"sc-reports-page",title:"分析报告"},{path:"/settings",component:"sc-settings-page",title:"系统设置"}],de=Z(window.location.hash.slice(1)||"/"),H=j(()=>{const e=de.get();return Ue(e)});function Ue(e){let t=V.find(a=>a.path===e);if(t)return{...t};for(const a of V){const i=Fe(a.path,e);if(i)return{...a,params:i}}return V[0]?{...V[0]}:null}function Fe(e,t){const a=e.split("/"),i=t.split("/");if(a.length!==i.length)return null;const r={};for(let s=0;s<a.length;s++){const o=a[s],l=i[s];if(o.startsWith(":"))r[o.slice(1)]=l;else if(o!==l)return null}return r}function U(e){window.location.hash=e}function oe(){const e=window.location.hash.slice(1)||"/";de.set(e);const t=H.get();t?.title&&(document.title=`${t.title} - SecuClaw`)}function We(){window.addEventListener("hashchange",oe),oe()}var Ge=Object.defineProperty,qe=Object.getOwnPropertyDescriptor,R=(e,t,a,i)=>{for(var r=i>1?void 0:i?qe(t,a):t,s=e.length-1,o;s>=0;s--)(o=e[s])&&(r=(i?o(t,a,r):o(r))||r);return i&&r&&Ge(t,a,r),r};let w=class extends v{constructor(){super(...arguments),this._username="",this._password="",this._loading=!1,this._error=null}async _handleSubmit(e){e.preventDefault(),this._loading=!0,this._error=null;const t=await T.login(this._username,this._password);this._loading=!1,t?(U("/"),window.dispatchEvent(new Event("hashchange"))):this._error=T.getState().error}render(){return n`
      <div class="login-container">
        <div class="login-card">
          <div class="logo">
            <svg class="logo-icon" viewBox="0 0 100 100">
              <defs>
                <linearGradient id="clawGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" style="stop-color:#3b82f6;stop-opacity:1" />
                  <stop offset="100%" style="stop-color:#2563eb;stop-opacity:1" />
                </linearGradient>
              </defs>
              <path d="M50 5 L90 20 L90 50 C90 75 70 90 50 95 C30 90 10 75 10 50 L10 20 Z" fill="url(#clawGradient)" />
              <path d="M30 35 L45 55 L30 75" stroke="#fff" stroke-width="4" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
              <path d="M50 30 L50 70" stroke="#fff" stroke-width="4" fill="none" stroke-linecap="round"/>
              <path d="M70 35 L55 55 L70 75" stroke="#fff" stroke-width="4" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            <div class="logo-title">SecuClaw</div>
            <div class="logo-subtitle">安爪安全控制台</div>
          </div>

          ${this._error?n`
            <div class="error-message">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="8" x2="12" y2="12"/>
                <line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              ${this._error}
            </div>
          `:""}

          <form @submit=${this._handleSubmit}>
            <div class="form-group">
              <label class="form-label" for="username">用户名</label>
              <input 
                type="text" 
                id="username"
                class="form-input"
                placeholder="请输入用户名"
                .value=${this._username}
                @input=${e=>this._username=e.target.value}
                ?disabled=${this._loading}
                required
              />
            </div>

            <div class="form-group">
              <label class="form-label" for="password">密码</label>
              <input 
                type="password" 
                id="password"
                class="form-input"
                placeholder="请输入密码"
                .value=${this._password}
                @input=${e=>this._password=e.target.value}
                ?disabled=${this._loading}
                required
              />
            </div>

            <div class="remember-me">
              <input type="checkbox" id="remember" />
              <label for="remember">记住我</label>
            </div>

            <button 
              type="submit" 
              class="btn-login"
              ?disabled=${this._loading||!this._username||!this._password}
            >
              ${this._loading?n`
                <span class="loading-spinner"></span>
                登录中...
              `:"登 录"}
            </button>
          </form>

          <div class="form-footer">
            <a href="#">忘记密码？</a>
          </div>

          <div class="demo-hint">
            演示账号: <code>admin</code> / <code>admin123</code>
          </div>
        </div>
      </div>
    `}};w.styles=p`
    :host {
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      background: var(--bg-primary);
    }

    .login-container {
      width: 100%;
      max-width: 400px;
      padding: var(--spacing-xl);
    }

    .login-card {
      background: var(--bg-card);
      border: 1px solid var(--border-color);
      border-radius: var(--border-radius);
      padding: var(--spacing-xl);
    }

    .logo {
      text-align: center;
      margin-bottom: var(--spacing-xl);
    }

    .logo-icon {
      width: 64px;
      height: 64px;
      margin-bottom: var(--spacing-md);
    }

    .logo-title {
      font-size: 1.5rem;
      font-weight: 700;
      color: var(--text-primary);
    }

    .logo-subtitle {
      font-size: 0.875rem;
      color: var(--text-muted);
      margin-top: var(--spacing-xs);
    }

    .form-group {
      margin-bottom: var(--spacing-lg);
    }

    .form-label {
      display: block;
      font-size: 0.875rem;
      font-weight: 500;
      margin-bottom: var(--spacing-sm);
      color: var(--text-secondary);
    }

    .form-input {
      width: 100%;
      padding: var(--spacing-md);
      background: var(--bg-tertiary);
      border: 1px solid var(--border-color);
      border-radius: var(--border-radius);
      color: var(--text-primary);
      font-size: 1rem;
      transition: border-color var(--transition-fast);
    }

    .form-input:focus {
      outline: none;
      border-color: var(--color-primary);
    }

    .form-input::placeholder {
      color: var(--text-muted);
    }

    .error-message {
      background: rgba(239, 68, 68, 0.1);
      border: 1px solid rgba(239, 68, 68, 0.3);
      border-radius: var(--border-radius);
      padding: var(--spacing-md);
      margin-bottom: var(--spacing-lg);
      color: var(--color-danger);
      font-size: 0.875rem;
      display: flex;
      align-items: center;
      gap: var(--spacing-sm);
    }

    .btn-login {
      width: 100%;
      padding: var(--spacing-md);
      background: var(--color-primary);
      border: none;
      border-radius: var(--border-radius);
      color: white;
      font-size: 1rem;
      font-weight: 600;
      cursor: pointer;
      transition: background var(--transition-fast);
    }

    .btn-login:hover {
      background: var(--color-primary-dark);
    }

    .btn-login:disabled {
      background: var(--bg-tertiary);
      color: var(--text-muted);
      cursor: not-allowed;
    }

    .loading-spinner {
      display: inline-block;
      width: 16px;
      height: 16px;
      border: 2px solid rgba(255, 255, 255, 0.3);
      border-radius: 50%;
      border-top-color: white;
      animation: spin 0.8s linear infinite;
      margin-right: var(--spacing-sm);
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    .form-footer {
      margin-top: var(--spacing-lg);
      text-align: center;
      font-size: 0.875rem;
      color: var(--text-muted);
    }

    .form-footer a {
      color: var(--color-primary);
      text-decoration: none;
    }

    .form-footer a:hover {
      text-decoration: underline;
    }

    .remember-me {
      display: flex;
      align-items: center;
      gap: var(--spacing-sm);
      margin-bottom: var(--spacing-lg);
    }

    .remember-me input[type="checkbox"] {
      width: 16px;
      height: 16px;
      accent-color: var(--color-primary);
    }

    .remember-me label {
      font-size: 0.875rem;
      color: var(--text-secondary);
      cursor: pointer;
    }

    .demo-hint {
      margin-top: var(--spacing-xl);
      padding: var(--spacing-md);
      background: var(--bg-tertiary);
      border-radius: var(--border-radius);
      font-size: 0.75rem;
      color: var(--text-muted);
      text-align: center;
    }

    .demo-hint code {
      background: var(--bg-secondary);
      padding: 2px 6px;
      border-radius: 4px;
      font-family: monospace;
    }
  `;R([c()],w.prototype,"_username",2);R([c()],w.prototype,"_password",2);R([c()],w.prototype,"_loading",2);R([c()],w.prototype,"_error",2);w=R([g("sc-login-page")],w);var Ke=Object.defineProperty,Xe=Object.getOwnPropertyDescriptor,q=(e,t,a,i)=>{for(var r=i>1?void 0:i?Xe(t,a):t,s=e.length-1,o;s>=0;s--)(o=e[s])&&(r=(i?o(t,a,r):o(r))||r);return i&&r&&Ke(t,a,r),r};let k=class extends v{constructor(){super(...arguments),this._threats=[{id:"T001",name:"APT28 鱼叉式钓鱼攻击",type:"APT",severity:"critical",source:"威胁情报源 A",iocs:["192.168.1.100","malware.exe"],description:"针对金融行业的定向攻击活动",firstSeen:"2024-01-15",lastSeen:"2024-03-01",status:"active"},{id:"T002",name:"Emotet 僵尸网络变种",type:"Malware",severity:"high",source:"安全厂商 B",iocs:["evil.com","payload.dll"],description:"新型 Emotet 变种，通过邮件传播",firstSeen:"2024-02-20",lastSeen:"2024-03-05",status:"active"},{id:"T003",name:"Log4j 漏洞利用尝试",type:"Vulnerability",severity:"critical",source:"IDS/IPS",iocs:["${jndi:ldap://...}"],description:"检测到 Log4j 远程代码执行漏洞利用尝试",firstSeen:"2024-03-01",lastSeen:"2024-03-05",status:"mitigated"},{id:"T004",name:"DDoS 攻击流量",type:"DDoS",severity:"medium",source:"网络监控",iocs:["10.0.0.0/24"],description:"来自特定 IP 段的异常流量",firstSeen:"2024-03-04",lastSeen:"2024-03-05",status:"active"},{id:"T005",name:"可疑 PowerShell 脚本",type:"Script",severity:"low",source:"EDR",iocs:["script.ps1"],description:"执行了混淆的 PowerShell 脚本",firstSeen:"2024-03-03",lastSeen:"2024-03-03",status:"false-positive"}],this._filter="all",this._search=""}_getSeverityLabel(e){return{critical:"严重",high:"高",medium:"中",low:"低"}[e]||e}_getStatusLabel(e){return{active:"活跃",mitigated:"已缓解","false-positive":"误报"}[e]||e}_getFilteredThreats(){return this._threats.filter(e=>{const t=this._filter==="all"||e.severity===this._filter||e.status===this._filter,a=this._search===""||e.name.toLowerCase().includes(this._search.toLowerCase())||e.type.toLowerCase().includes(this._search.toLowerCase());return t&&a})}render(){const e=this._getFilteredThreats();return n`
      <div class="page-header">
        <h1 class="page-title">威胁情报</h1>
        <button class="btn-primary">+ 添加威胁</button>
      </div>

      <div class="toolbar">
        <input 
          type="text" 
          class="search-input"
          placeholder="搜索威胁..."
          .value=${this._search}
          @input=${t=>this._search=t.target.value}
        />
        <select 
          class="filter-select"
          .value=${this._filter}
          @change=${t=>this._filter=t.target.value}
        >
          <option value="all">全部威胁</option>
          <option value="critical">严重</option>
          <option value="high">高</option>
          <option value="medium">中</option>
          <option value="low">低</option>
          <option value="active">活跃</option>
          <option value="mitigated">已缓解</option>
        </select>
      </div>

      <table class="threat-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>威胁名称</th>
            <th>类型</th>
            <th>严重程度</th>
            <th>来源</th>
            <th>最后发现</th>
            <th>状态</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          ${e.map(t=>n`
            <tr>
              <td>${t.id}</td>
              <td>${t.name}</td>
              <td>${t.type}</td>
              <td>
                <span class="severity-badge severity-${t.severity}">
                  ${this._getSeverityLabel(t.severity)}
                </span>
              </td>
              <td>${t.source}</td>
              <td>${t.lastSeen}</td>
              <td>
                <span class="status-badge status-${t.status}">
                  ${this._getStatusLabel(t.status)}
                </span>
              </td>
              <td>
                <button class="action-btn" title="查看详情">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                    <circle cx="12" cy="12" r="3"/>
                  </svg>
                </button>
                <button class="action-btn" title="导出">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
                    <polyline points="7 10 12 15 17 10"/>
                    <line x1="12" y1="15" x2="12" y2="3"/>
                  </svg>
                </button>
              </td>
            </tr>
          `)}
        </tbody>
      </table>
    `}};k.styles=p`
    :host {
      display: block;
    }

    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: var(--spacing-lg);
    }

    .page-title {
      font-size: 1.5rem;
      font-weight: 600;
    }

    .toolbar {
      display: flex;
      gap: var(--spacing-md);
      margin-bottom: var(--spacing-lg);
    }

    .search-input {
      flex: 1;
      max-width: 300px;
    }

    .filter-select {
      min-width: 150px;
    }

    .threat-table {
      width: 100%;
      border-collapse: collapse;
      background: var(--bg-card);
      border: 1px solid var(--border-color);
      border-radius: var(--border-radius);
      overflow: hidden;
    }

    .threat-table th,
    .threat-table td {
      padding: var(--spacing-md);
      text-align: left;
      border-bottom: 1px solid var(--border-color);
    }

    .threat-table th {
      background: var(--bg-secondary);
      font-weight: 600;
      font-size: 0.75rem;
      text-transform: uppercase;
      color: var(--text-muted);
    }

    .threat-table tr:hover td {
      background: var(--bg-hover);
    }

    .threat-table tr:last-child td {
      border-bottom: none;
    }

    .severity-badge {
      display: inline-flex;
      align-items: center;
      padding: 2px 8px;
      border-radius: 9999px;
      font-size: 0.75rem;
      font-weight: 500;
    }

    .severity-critical { background: rgba(239, 68, 68, 0.2); color: var(--color-danger); }
    .severity-high { background: rgba(245, 158, 11, 0.2); color: var(--color-warning); }
    .severity-medium { background: rgba(6, 182, 212, 0.2); color: var(--color-info); }
    .severity-low { background: rgba(16, 185, 129, 0.2); color: var(--color-success); }

    .status-badge {
      display: inline-flex;
      align-items: center;
      padding: 2px 8px;
      border-radius: 9999px;
      font-size: 0.75rem;
    }

    .status-active { background: rgba(239, 68, 68, 0.2); color: var(--color-danger); }
    .status-mitigated { background: rgba(16, 185, 129, 0.2); color: var(--color-success); }
    .status-false-positive { background: rgba(100, 116, 139, 0.2); color: var(--text-muted); }

    .action-btn {
      background: none;
      border: none;
      color: var(--text-secondary);
      cursor: pointer;
      padding: var(--spacing-xs);
      border-radius: var(--border-radius);
      transition: all var(--transition-fast);
    }

    .action-btn:hover {
      background: var(--bg-hover);
      color: var(--text-primary);
    }

    .btn-primary {
      background: var(--color-primary);
      color: white;
      padding: var(--spacing-sm) var(--spacing-md);
      border-radius: var(--border-radius);
      border: none;
      cursor: pointer;
      font-weight: 500;
      transition: background var(--transition-fast);
    }

    .btn-primary:hover {
      background: var(--color-primary-dark);
    }
  `;q([c()],k.prototype,"_threats",2);q([c()],k.prototype,"_filter",2);q([c()],k.prototype,"_search",2);k=q([g("sc-threats-page")],k);var Ye=Object.defineProperty,Je=Object.getOwnPropertyDescriptor,z=(e,t,a,i)=>{for(var r=i>1?void 0:i?Je(t,a):t,s=e.length-1,o;s>=0;s--)(o=e[s])&&(r=(i?o(t,a,r):o(r))||r);return i&&r&&Ye(t,a,r),r};const Qe={malware:"恶意软件",intrusion:"入侵检测",ddos:"DDoS 攻击",phishing:"钓鱼攻击","data-breach":"数据泄露",other:"其他"},Ze={open:"待处理",investigating:"调查中",contained:"已遏制",resolved:"已解决"};let f=class extends v{constructor(){super(...arguments),this._incidents=this._generateMockIncidents(),this._selectedIncident=null,this._viewMode="list",this._filter="all",this._search=""}_generateMockIncidents(){return[{id:"INC-2024-001",title:"检测到可疑横向移动行为",type:"intrusion",severity:"critical",status:"investigating",assignee:"张安全",affectedAssets:["SERVER-01","WORKSTATION-15","DC-02"],description:"在内部网络中检测到可疑的横向移动尝试，攻击者可能已获取初始访问权限。",timeline:[{id:"1",timestamp:new Date("2024-03-05T09:30:00"),action:"事件创建",user:"系统",details:"SIEM 自动检测到异常"},{id:"2",timestamp:new Date("2024-03-05T09:45:00"),action:"开始调查",user:"张安全"},{id:"3",timestamp:new Date("2024-03-05T10:15:00"),action:"隔离受影响主机",user:"张安全",details:"SERVER-01 已隔离"}],createdAt:new Date("2024-03-05T09:30:00"),updatedAt:new Date("2024-03-05T10:15:00")},{id:"INC-2024-002",title:"勒索软件感染事件",type:"malware",severity:"critical",status:"contained",assignee:"李响应",affectedAssets:["WORKSTATION-22","FILE-SERVER-03"],description:"检测到勒索软件加密文件行为，已及时遏制。",timeline:[{id:"1",timestamp:new Date("2024-03-04T14:20:00"),action:"事件创建",user:"EDR系统"},{id:"2",timestamp:new Date("2024-03-04T14:25:00"),action:"自动隔离",user:"EDR系统"},{id:"3",timestamp:new Date("2024-03-04T15:00:00"),action:"确认遏制",user:"李响应"}],createdAt:new Date("2024-03-04T14:20:00"),updatedAt:new Date("2024-03-04T15:00:00")},{id:"INC-2024-003",title:"钓鱼邮件攻击",type:"phishing",severity:"high",status:"resolved",assignee:"王防护",affectedAssets:["MAIL-SERVER-01","USER-MAILBOXES"],description:"检测到大规模钓鱼邮件攻击，已阻止并通知用户。",timeline:[{id:"1",timestamp:new Date("2024-03-03T08:00:00"),action:"事件创建",user:"邮件网关"},{id:"2",timestamp:new Date("2024-03-03T08:15:00"),action:"阻止邮件",user:"王防护"},{id:"3",timestamp:new Date("2024-03-03T09:00:00"),action:"用户通知",user:"王防护"},{id:"4",timestamp:new Date("2024-03-03T16:00:00"),action:"事件关闭",user:"王防护"}],createdAt:new Date("2024-03-03T08:00:00"),updatedAt:new Date("2024-03-03T16:00:00")},{id:"INC-2024-004",title:"DDoS 攻击检测",type:"ddos",severity:"medium",status:"resolved",assignee:"赵网络",affectedAssets:["WEB-FRONTEND","LOAD-BALANCER"],description:"Web 服务遭受 DDoS 攻击，已通过 CDN 缓解。",timeline:[{id:"1",timestamp:new Date("2024-03-02T20:00:00"),action:"流量异常告警",user:"监控系统"},{id:"2",timestamp:new Date("2024-03-02T20:05:00"),action:"启用 CDN 防护",user:"赵网络"},{id:"3",timestamp:new Date("2024-03-02T21:30:00"),action:"攻击停止",user:"监控系统"}],createdAt:new Date("2024-03-02T20:00:00"),updatedAt:new Date("2024-03-02T21:30:00")}]}_getFilteredIncidents(){return this._incidents.filter(e=>{const t=this._filter==="all"||e.severity===this._filter||e.status===this._filter,a=this._search===""||e.title.toLowerCase().includes(this._search.toLowerCase())||e.id.toLowerCase().includes(this._search.toLowerCase());return t&&a})}_formatDate(e){return e.toLocaleString("zh-CN",{month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit"})}_selectIncident(e){this._selectedIncident=this._selectedIncident?.id===e.id?null:e}render(){const e=this._getFilteredIncidents();return n`
      <div class="page-header">
        <h1 class="page-title">安全事件</h1>
        <button class="btn btn-primary">+ 创建事件</button>
      </div>

      <div class="toolbar">
        <input 
          type="text" 
          class="search-input"
          placeholder="搜索事件..."
          .value=${this._search}
          @input=${t=>this._search=t.target.value}
        />
        <select 
          class="filter-select"
          .value=${this._filter}
          @change=${t=>this._filter=t.target.value}
        >
          <option value="all">全部状态</option>
          <option value="open">待处理</option>
          <option value="investigating">调查中</option>
          <option value="contained">已遏制</option>
          <option value="resolved">已解决</option>
          <option value="critical">严重</option>
          <option value="high">高</option>
        </select>
        <div class="view-toggle">
          <button 
            class="view-btn ${this._viewMode==="list"?"active":""}"
            @click=${()=>this._viewMode="list"}
          >列表</button>
          <button 
            class="view-btn ${this._viewMode==="timeline"?"active":""}"
            @click=${()=>this._viewMode="timeline"}
          >时间线</button>
        </div>
      </div>

      ${this._viewMode==="list"?this._renderListView(e):this._renderTimelineView(e)}
    `}_renderListView(e){return n`
      <div class="incidents-list">
        ${e.map(t=>n`
          <div 
            class="incident-card ${this._selectedIncident?.id===t.id?"selected":""}"
            @click=${()=>this._selectIncident(t)}
          >
            <div class="incident-header">
              <div>
                <div class="incident-id">${t.id}</div>
                <div class="incident-title">${t.title}</div>
              </div>
              <div class="incident-badges">
                <span class="badge severity-${t.severity}">
                  ${t.severity==="critical"?"严重":t.severity==="high"?"高":t.severity==="medium"?"中":"低"}
                </span>
                <span class="badge status-${t.status}">
                  ${Ze[t.status]}
                </span>
              </div>
            </div>
            <div class="incident-meta">
              <span>类型: ${Qe[t.type]}</span>
              <span>负责人: ${t.assignee}</span>
              <span>更新: ${this._formatDate(t.updatedAt)}</span>
            </div>
            <div class="incident-assets">
              ${t.affectedAssets.map(a=>n`<span class="asset-tag">${a}</span>`)}
            </div>
          </div>
        `)}
      </div>
    `}_renderTimelineView(e){const t=this._selectedIncident||e[0];return n`
      <div class="timeline-view">
        <div class="incidents-list" style="max-height: 600px; overflow-y: auto;">
          ${e.map(a=>n`
            <div 
              class="incident-card ${t?.id===a.id?"selected":""}"
              @click=${()=>this._selectedIncident=a}
            >
              <div class="incident-header">
                <div>
                  <div class="incident-id">${a.id}</div>
                  <div class="incident-title">${a.title}</div>
                </div>
                <span class="badge severity-${a.severity}">
                  ${a.severity==="critical"?"严重":a.severity==="high"?"高":"中"}
                </span>
              </div>
            </div>
          `)}
        </div>

        ${t?n`
          <div class="detail-panel">
            <h3 style="margin-bottom: var(--spacing-md);">${t.title}</h3>
            
            <div class="detail-section">
              <div class="detail-label">描述</div>
              <div class="detail-value">${t.description}</div>
            </div>

            <div class="detail-section">
              <div class="detail-label">时间线</div>
              <div class="timeline">
                ${t.timeline.map(a=>n`
                  <div class="timeline-item">
                    <div class="timeline-dot"></div>
                    <div class="timeline-time">${this._formatDate(a.timestamp)}</div>
                    <div class="timeline-action">${a.action}</div>
                    ${a.details?n`<div class="timeline-details">${a.details}</div>`:""}
                    <div class="timeline-user">操作人: ${a.user}</div>
                  </div>
                `)}
              </div>
            </div>

            <div class="actions-bar">
              <button class="btn">更新状态</button>
              <button class="btn">添加备注</button>
              <button class="btn btn-primary">导出报告</button>
            </div>
          </div>
        `:""}
      </div>
    `}};f.styles=p`
    :host {
      display: block;
    }

    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: var(--spacing-lg);
    }

    .page-title {
      font-size: 1.5rem;
      font-weight: 600;
    }

    .toolbar {
      display: flex;
      gap: var(--spacing-md);
      margin-bottom: var(--spacing-lg);
      flex-wrap: wrap;
    }

    .search-input {
      flex: 1;
      min-width: 200px;
      max-width: 300px;
    }

    .filter-select {
      min-width: 150px;
    }

    .view-toggle {
      display: flex;
      background: var(--bg-tertiary);
      border-radius: var(--border-radius);
      padding: 2px;
    }

    .view-btn {
      padding: var(--spacing-xs) var(--spacing-md);
      border: none;
      background: transparent;
      color: var(--text-muted);
      cursor: pointer;
      border-radius: 6px;
      transition: all var(--transition-fast);
    }

    .view-btn.active {
      background: var(--color-primary);
      color: white;
    }

    .incidents-list {
      display: flex;
      flex-direction: column;
      gap: var(--spacing-md);
    }

    .incident-card {
      background: var(--bg-card);
      border: 1px solid var(--border-color);
      border-radius: var(--border-radius);
      padding: var(--spacing-lg);
      cursor: pointer;
      transition: all var(--transition-fast);
    }

    .incident-card:hover {
      border-color: var(--color-primary);
    }

    .incident-card.selected {
      border-color: var(--color-primary);
      box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2);
    }

    .incident-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: var(--spacing-md);
    }

    .incident-id {
      font-family: monospace;
      font-size: 0.75rem;
      color: var(--text-muted);
    }

    .incident-title {
      font-weight: 600;
      font-size: 1rem;
      margin-top: var(--spacing-xs);
    }

    .incident-badges {
      display: flex;
      gap: var(--spacing-sm);
    }

    .badge {
      padding: 2px 8px;
      border-radius: 9999px;
      font-size: 0.75rem;
      font-weight: 500;
    }

    .severity-critical { background: rgba(239, 68, 68, 0.2); color: var(--color-danger); }
    .severity-high { background: rgba(245, 158, 11, 0.2); color: var(--color-warning); }
    .severity-medium { background: rgba(6, 182, 212, 0.2); color: var(--color-info); }
    .severity-low { background: rgba(16, 185, 129, 0.2); color: var(--color-success); }

    .status-open { background: rgba(239, 68, 68, 0.2); color: var(--color-danger); }
    .status-investigating { background: rgba(245, 158, 11, 0.2); color: var(--color-warning); }
    .status-contained { background: rgba(6, 182, 212, 0.2); color: var(--color-info); }
    .status-resolved { background: rgba(16, 185, 129, 0.2); color: var(--color-success); }

    .incident-meta {
      display: flex;
      gap: var(--spacing-lg);
      color: var(--text-muted);
      font-size: 0.875rem;
    }

    .incident-assets {
      margin-top: var(--spacing-md);
      display: flex;
      flex-wrap: wrap;
      gap: var(--spacing-xs);
    }

    .asset-tag {
      background: var(--bg-tertiary);
      padding: 2px 8px;
      border-radius: 4px;
      font-size: 0.75rem;
      color: var(--text-secondary);
    }

    /* Timeline View */
    .timeline-view {
      display: grid;
      grid-template-columns: 1fr 300px;
      gap: var(--spacing-lg);
    }

    .timeline-container {
      background: var(--bg-card);
      border: 1px solid var(--border-color);
      border-radius: var(--border-radius);
      padding: var(--spacing-lg);
    }

    .timeline-title {
      font-weight: 600;
      margin-bottom: var(--spacing-lg);
    }

    .timeline {
      position: relative;
      padding-left: var(--spacing-xl);
    }

    .timeline::before {
      content: '';
      position: absolute;
      left: 8px;
      top: 0;
      bottom: 0;
      width: 2px;
      background: var(--border-color);
    }

    .timeline-item {
      position: relative;
      padding-bottom: var(--spacing-lg);
    }

    .timeline-item:last-child {
      padding-bottom: 0;
    }

    .timeline-dot {
      position: absolute;
      left: calc(-1 * var(--spacing-xl) + 4px);
      width: 10px;
      height: 10px;
      border-radius: 50%;
      background: var(--color-primary);
      border: 2px solid var(--bg-card);
    }

    .timeline-time {
      font-size: 0.75rem;
      color: var(--text-muted);
      margin-bottom: var(--spacing-xs);
    }

    .timeline-action {
      font-weight: 500;
      margin-bottom: var(--spacing-xs);
    }

    .timeline-details {
      font-size: 0.875rem;
      color: var(--text-secondary);
    }

    .timeline-user {
      font-size: 0.75rem;
      color: var(--text-muted);
      margin-top: var(--spacing-xs);
    }

    .detail-panel {
      background: var(--bg-card);
      border: 1px solid var(--border-color);
      border-radius: var(--border-radius);
      padding: var(--spacing-lg);
    }

    .detail-section {
      margin-bottom: var(--spacing-lg);
    }

    .detail-label {
      font-size: 0.75rem;
      color: var(--text-muted);
      text-transform: uppercase;
      margin-bottom: var(--spacing-xs);
    }

    .detail-value {
      color: var(--text-primary);
    }

    .btn {
      padding: var(--spacing-sm) var(--spacing-md);
      border-radius: var(--border-radius);
      border: 1px solid var(--border-color);
      background: var(--bg-tertiary);
      color: var(--text-secondary);
      cursor: pointer;
      font-size: 0.875rem;
      transition: all var(--transition-fast);
    }

    .btn:hover {
      background: var(--bg-hover);
      color: var(--text-primary);
    }

    .btn-primary {
      background: var(--color-primary);
      border-color: var(--color-primary);
      color: white;
    }

    .btn-primary:hover {
      background: var(--color-primary-dark);
    }

    .actions-bar {
      display: flex;
      gap: var(--spacing-sm);
      margin-top: var(--spacing-lg);
    }

    @media (max-width: 1024px) {
      .timeline-view {
        grid-template-columns: 1fr;
      }
    }
  `;z([c()],f.prototype,"_incidents",2);z([c()],f.prototype,"_selectedIncident",2);z([c()],f.prototype,"_viewMode",2);z([c()],f.prototype,"_filter",2);z([c()],f.prototype,"_search",2);f=z([g("sc-incidents-page")],f);var et=Object.defineProperty,tt=Object.getOwnPropertyDescriptor,pe=(e,t,a,i)=>{for(var r=i>1?void 0:i?tt(t,a):t,s=e.length-1,o;s>=0;s--)(o=e[s])&&(r=(i?o(t,a,r):o(r))||r);return i&&r&&et(t,a,r),r};let G=class extends v{constructor(){super(...arguments),this._vulnerabilities=[{id:"V001",cve:"CVE-2024-1234",name:"Log4j 远程代码执行漏洞",severity:"critical",cvss:10,affectedSystems:["Server-01","Server-02","App-Server"],description:"Apache Log4j2 存在远程代码执行漏洞，攻击者可通过 JNDI 注入执行任意代码。",publishedDate:"2024-01-10",patched:!1,exploitAvailable:!0},{id:"V002",cve:"CVE-2024-2345",name:"Spring Framework RCE",severity:"critical",cvss:9.8,affectedSystems:["Web-Server","API-Gateway"],description:"Spring Framework 存在远程代码执行漏洞，影响使用 JDK 9+ 的应用。",publishedDate:"2024-02-15",patched:!0,exploitAvailable:!0},{id:"V003",cve:"CVE-2024-3456",name:"OpenSSL 缓冲区溢出",severity:"high",cvss:7.5,affectedSystems:["Load-Balancer","Proxy-Server"],description:"OpenSSL 在处理特定证书时存在缓冲区溢出漏洞。",publishedDate:"2024-02-20",patched:!1,exploitAvailable:!1},{id:"V004",cve:"CVE-2024-4567",name:"Nginx 请求走私漏洞",severity:"medium",cvss:5.3,affectedSystems:["Web-Proxy"],description:"特定配置下 Nginx 可能受到 HTTP 请求走私攻击。",publishedDate:"2024-03-01",patched:!0,exploitAvailable:!1}]}_getSeverityClass(e){return e>=9?"cvss-critical":e>=7?"cvss-high":e>=4?"cvss-medium":"cvss-low"}_getStats(){return{total:this._vulnerabilities.length,critical:this._vulnerabilities.filter(e=>e.severity==="critical").length,high:this._vulnerabilities.filter(e=>e.severity==="high").length,unpatched:this._vulnerabilities.filter(e=>!e.patched).length}}render(){const e=this._getStats();return n`
      <div class="page-header">
        <h1 class="page-title">漏洞管理</h1>
      </div>

      <!-- Stats Grid -->
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-value">${e.total}</div>
          <div class="stat-label">总漏洞数</div>
        </div>
        <div class="stat-card">
          <div class="stat-value stat-critical">${e.critical}</div>
          <div class="stat-label">严重漏洞</div>
        </div>
        <div class="stat-card">
          <div class="stat-value stat-high">${e.high}</div>
          <div class="stat-label">高危漏洞</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">${e.unpatched}</div>
          <div class="stat-label">待修复</div>
        </div>
      </div>

      <!-- Vulnerabilities List -->
      <div class="vuln-grid">
        ${this._vulnerabilities.map(t=>n`
          <div class="vuln-card">
            <div class="cvss-score ${this._getSeverityClass(t.cvss)}">
              ${t.cvss.toFixed(1)}
            </div>
            <div class="vuln-content">
              <div class="vuln-header">
                <span class="vuln-cve">${t.cve}</span>
                ${t.exploitAvailable?n`<span class="badge badge-exploit">存在利用</span>`:""}
                ${t.patched?n`<span class="badge badge-patched">已修复</span>`:""}
              </div>
              <div class="vuln-name">${t.name}</div>
              <div class="vuln-description">${t.description}</div>
              <div class="vuln-meta">
                <span>影响系统: ${t.affectedSystems.join(", ")}</span>
                <span>发布日期: ${t.publishedDate}</span>
              </div>
            </div>
            <div class="vuln-actions">
              <button class="btn btn-primary">查看详情</button>
              <button class="btn">${t.patched?"取消标记":"标记已修复"}</button>
            </div>
          </div>
        `)}
      </div>
    `}};G.styles=p`
    :host {
      display: block;
    }

    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: var(--spacing-lg);
    }

    .page-title {
      font-size: 1.5rem;
      font-weight: 600;
    }

    .stats-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: var(--spacing-md);
      margin-bottom: var(--spacing-lg);
    }

    .stat-card {
      background: var(--bg-card);
      border: 1px solid var(--border-color);
      border-radius: var(--border-radius);
      padding: var(--spacing-md);
    }

    .stat-value {
      font-size: 2rem;
      font-weight: 700;
    }

    .stat-label {
      color: var(--text-muted);
      font-size: 0.875rem;
    }

    .stat-critical { color: var(--color-danger); }
    .stat-high { color: var(--color-warning); }
    .stat-medium { color: var(--color-info); }
    .stat-low { color: var(--color-success); }

    .vuln-grid {
      display: grid;
      gap: var(--spacing-md);
    }

    .vuln-card {
      background: var(--bg-card);
      border: 1px solid var(--border-color);
      border-radius: var(--border-radius);
      padding: var(--spacing-lg);
      display: grid;
      grid-template-columns: auto 1fr auto;
      gap: var(--spacing-md);
      align-items: start;
    }

    .cvss-score {
      width: 60px;
      height: 60px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 700;
      font-size: 1.25rem;
    }

    .cvss-critical { background: rgba(239, 68, 68, 0.2); color: var(--color-danger); border: 2px solid var(--color-danger); }
    .cvss-high { background: rgba(245, 158, 11, 0.2); color: var(--color-warning); border: 2px solid var(--color-warning); }
    .cvss-medium { background: rgba(6, 182, 212, 0.2); color: var(--color-info); border: 2px solid var(--color-info); }
    .cvss-low { background: rgba(16, 185, 129, 0.2); color: var(--color-success); border: 2px solid var(--color-success); }

    .vuln-content {
      flex: 1;
    }

    .vuln-header {
      display: flex;
      align-items: center;
      gap: var(--spacing-sm);
      margin-bottom: var(--spacing-xs);
    }

    .vuln-cve {
      font-family: monospace;
      font-size: 0.875rem;
      color: var(--color-primary);
    }

    .vuln-name {
      font-weight: 600;
      margin-bottom: var(--spacing-xs);
    }

    .vuln-description {
      font-size: 0.875rem;
      color: var(--text-secondary);
      margin-bottom: var(--spacing-sm);
    }

    .vuln-meta {
      display: flex;
      gap: var(--spacing-md);
      font-size: 0.75rem;
      color: var(--text-muted);
    }

    .vuln-actions {
      display: flex;
      flex-direction: column;
      gap: var(--spacing-xs);
    }

    .btn {
      padding: var(--spacing-xs) var(--spacing-sm);
      border-radius: var(--border-radius);
      border: 1px solid var(--border-color);
      background: var(--bg-tertiary);
      color: var(--text-secondary);
      cursor: pointer;
      font-size: 0.75rem;
      transition: all var(--transition-fast);
    }

    .btn:hover {
      background: var(--bg-hover);
      color: var(--text-primary);
    }

    .btn-primary {
      background: var(--color-primary);
      border-color: var(--color-primary);
      color: white;
    }

    .btn-primary:hover {
      background: var(--color-primary-dark);
    }

    .badge {
      display: inline-flex;
      align-items: center;
      padding: 2px 6px;
      border-radius: 4px;
      font-size: 0.625rem;
      font-weight: 500;
    }

    .badge-exploit {
      background: rgba(239, 68, 68, 0.2);
      color: var(--color-danger);
    }

    .badge-patched {
      background: rgba(16, 185, 129, 0.2);
      color: var(--color-success);
    }
  `;pe([c()],G.prototype,"_vulnerabilities",2);G=pe([g("sc-vulnerabilities-page")],G);var rt=Object.defineProperty,at=Object.getOwnPropertyDescriptor,K=(e,t,a,i)=>{for(var r=i>1?void 0:i?at(t,a):t,s=e.length-1,o;s>=0;s--)(o=e[s])&&(r=(i?o(t,a,r):o(r))||r);return i&&r&&rt(t,a,r),r};const it=[{id:"iso27001",name:"ISO 27001:2022",description:"信息安全管理体系国际标准",totalControls:93,passedControls:78,failedControls:5,pendingControls:10,lastAudit:new Date("2024-01-15"),nextAudit:new Date("2024-07-15"),status:"compliant"},{id:"soc2",name:"SOC 2 Type II",description:"服务组织控制报告",totalControls:87,passedControls:65,failedControls:12,pendingControls:10,lastAudit:new Date("2024-02-01"),nextAudit:new Date("2024-08-01"),status:"partial"},{id:"gdpr",name:"GDPR",description:"欧盟通用数据保护条例",totalControls:45,passedControls:40,failedControls:2,pendingControls:3,lastAudit:new Date("2024-01-20"),nextAudit:new Date("2024-07-20"),status:"compliant"},{id:"pci-dss",name:"PCI DSS v4.0",description:"支付卡行业数据安全标准",totalControls:64,passedControls:45,failedControls:15,pendingControls:4,lastAudit:new Date("2024-02-10"),nextAudit:new Date("2024-08-10"),status:"non-compliant"}];let $=class extends v{constructor(){super(...arguments),this._frameworks=it,this._selectedReport="full",this._selectedFramework=null}_getOverallStats(){const e=this._frameworks.reduce((r,s)=>r+s.totalControls,0),t=this._frameworks.reduce((r,s)=>r+s.passedControls,0),a=this._frameworks.reduce((r,s)=>r+s.failedControls,0),i=this._frameworks.reduce((r,s)=>r+s.pendingControls,0);return{total:e,passed:t,failed:a,pending:i}}_getStatusLabel(e){return{compliant:"合规",partial:"部分合规","non-compliant":"不合规"}[e]||e}_formatDate(e){return e.toLocaleDateString("zh-CN")}render(){const e=this._getOverallStats();return n`
      <div class="page-header">
        <h1 class="page-title">合规审计</h1>
        <div class="actions-row">
          <button class="btn">开始审计</button>
          <button class="btn btn-primary">生成报告</button>
        </div>
      </div>

      <!-- Overview Stats -->
      <div class="overview-grid">
        <div class="overview-card">
          <div class="overview-value">${e.total}</div>
          <div class="overview-label">总控制项</div>
        </div>
        <div class="overview-card">
          <div class="overview-value text-success">${e.passed}</div>
          <div class="overview-label">通过项</div>
        </div>
        <div class="overview-card">
          <div class="overview-value text-danger">${e.failed}</div>
          <div class="overview-label">失败项</div>
        </div>
        <div class="overview-card">
          <div class="overview-value text-warning">${e.pending}</div>
          <div class="overview-label">待检查</div>
        </div>
      </div>

      <!-- Framework Cards -->
      <h2 style="margin-bottom: var(--spacing-md);">合规框架</h2>
      <div class="frameworks-grid">
        ${this._frameworks.map(t=>{const a=t.passedControls/t.totalControls*100;return t.failedControls/t.totalControls*100,n`
            <div class="framework-card" @click=${()=>this._selectedFramework=t.id}>
              <div class="framework-header">
                <div>
                  <div class="framework-name">${t.name}</div>
                  <div class="framework-desc">${t.description}</div>
                </div>
                <span class="status-badge status-${t.status}">
                  ${this._getStatusLabel(t.status)}
                </span>
              </div>
              
              <div class="progress-bar">
                <div class="progress-fill progress-pass" style="width: ${a}%"></div>
              </div>
              
              <div class="framework-stats">
                <span>✓ 通过: ${t.passedControls}</span>
                <span>✗ 失败: ${t.failedControls}</span>
                <span>○ 待检: ${t.pendingControls}</span>
              </div>
              
              <div class="framework-dates">
                <span>上次审计: ${this._formatDate(t.lastAudit)}</span>
                <span>下次审计: ${this._formatDate(t.nextAudit)}</span>
              </div>
            </div>
          `})}
      </div>

      <!-- Report Generation -->
      <div class="report-section">
        <h3 class="section-title">生成报告</h3>
        
        <div class="report-options">
          <div 
            class="report-option ${this._selectedReport==="full"?"selected":""}"
            @click=${()=>this._selectedReport="full"}
          >
            <svg class="report-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
              <line x1="16" y1="13" x2="8" y2="13"/>
              <line x1="16" y1="17" x2="8" y2="17"/>
              <polyline points="10 9 9 9 8 9"/>
            </svg>
            <div class="report-name">完整审计报告</div>
            <div class="report-desc">包含所有框架详细检查结果</div>
          </div>
          
          <div 
            class="report-option ${this._selectedReport==="summary"?"selected":""}"
            @click=${()=>this._selectedReport="summary"}
          >
            <svg class="report-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="7 10 12 15 17 10"/>
              <line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
            <div class="report-name">执行摘要</div>
            <div class="report-desc">高层管理概述</div>
          </div>
          
          <div 
            class="report-option ${this._selectedReport==="gap"?"selected":""}"
            @click=${()=>this._selectedReport="gap"}
          >
            <svg class="report-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"/>
              <line x1="12" y1="8" x2="12" y2="12"/>
              <line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            <div class="report-name">差距分析</div>
            <div class="report-desc">识别合规差距和改进建议</div>
          </div>
        </div>

        <button class="btn btn-primary">下载 PDF 报告</button>
      </div>
    `}};$.styles=p`
    :host {
      display: block;
    }

    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: var(--spacing-lg);
    }

    .page-title {
      font-size: 1.5rem;
      font-weight: 600;
    }

    /* Overview Stats */
    .overview-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: var(--spacing-md);
      margin-bottom: var(--spacing-xl);
    }

    .overview-card {
      background: var(--bg-card);
      border: 1px solid var(--border-color);
      border-radius: var(--border-radius);
      padding: var(--spacing-lg);
      text-align: center;
    }

    .overview-value {
      font-size: 2.5rem;
      font-weight: 700;
    }

    .overview-label {
      color: var(--text-muted);
      font-size: 0.875rem;
      margin-top: var(--spacing-xs);
    }

    .text-success { color: var(--color-success); }
    .text-warning { color: var(--color-warning); }
    .text-danger { color: var(--color-danger); }
    .text-info { color: var(--color-info); }

    /* Framework Cards */
    .frameworks-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: var(--spacing-lg);
      margin-bottom: var(--spacing-xl);
    }

    .framework-card {
      background: var(--bg-card);
      border: 1px solid var(--border-color);
      border-radius: var(--border-radius);
      padding: var(--spacing-lg);
      cursor: pointer;
      transition: all var(--transition-fast);
    }

    .framework-card:hover {
      border-color: var(--color-primary);
    }

    .framework-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: var(--spacing-md);
    }

    .framework-name {
      font-weight: 600;
      font-size: 1.125rem;
    }

    .framework-desc {
      color: var(--text-muted);
      font-size: 0.875rem;
      margin-top: var(--spacing-xs);
    }

    .status-badge {
      padding: 4px 12px;
      border-radius: 9999px;
      font-size: 0.75rem;
      font-weight: 500;
    }

    .status-compliant { background: rgba(16, 185, 129, 0.2); color: var(--color-success); }
    .status-partial { background: rgba(245, 158, 11, 0.2); color: var(--color-warning); }
    .status-non-compliant { background: rgba(239, 68, 68, 0.2); color: var(--color-danger); }

    .progress-bar {
      height: 8px;
      background: var(--bg-tertiary);
      border-radius: 4px;
      margin: var(--spacing-md) 0;
      overflow: hidden;
    }

    .progress-fill {
      height: 100%;
      border-radius: 4px;
      transition: width var(--transition-normal);
    }

    .progress-pass { background: var(--color-success); }
    .progress-fail { background: var(--color-danger); }
    .progress-pending { background: var(--color-warning); }

    .framework-stats {
      display: flex;
      gap: var(--spacing-lg);
      font-size: 0.875rem;
      color: var(--text-secondary);
    }

    .framework-dates {
      display: flex;
      gap: var(--spacing-lg);
      margin-top: var(--spacing-md);
      font-size: 0.75rem;
      color: var(--text-muted);
    }

    /* Report Section */
    .report-section {
      background: var(--bg-card);
      border: 1px solid var(--border-color);
      border-radius: var(--border-radius);
      padding: var(--spacing-lg);
    }

    .section-title {
      font-size: 1.125rem;
      font-weight: 600;
      margin-bottom: var(--spacing-lg);
    }

    .report-options {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: var(--spacing-md);
      margin-bottom: var(--spacing-lg);
    }

    .report-option {
      background: var(--bg-tertiary);
      border: 1px solid var(--border-color);
      border-radius: var(--border-radius);
      padding: var(--spacing-md);
      cursor: pointer;
      text-align: center;
      transition: all var(--transition-fast);
    }

    .report-option:hover {
      border-color: var(--color-primary);
    }

    .report-option.selected {
      border-color: var(--color-primary);
      background: rgba(59, 130, 246, 0.1);
    }

    .report-icon {
      width: 40px;
      height: 40px;
      margin: 0 auto var(--spacing-sm);
      color: var(--color-primary);
    }

    .report-name {
      font-weight: 500;
    }

    .report-desc {
      font-size: 0.75rem;
      color: var(--text-muted);
      margin-top: var(--spacing-xs);
    }

    .btn {
      padding: var(--spacing-sm) var(--spacing-lg);
      border-radius: var(--border-radius);
      border: 1px solid var(--border-color);
      background: var(--bg-tertiary);
      color: var(--text-secondary);
      cursor: pointer;
      font-size: 0.875rem;
      transition: all var(--transition-fast);
    }

    .btn:hover {
      background: var(--bg-hover);
      color: var(--text-primary);
    }

    .btn-primary {
      background: var(--color-primary);
      border-color: var(--color-primary);
      color: white;
    }

    .btn-primary:hover {
      background: var(--color-primary-dark);
    }

    .actions-row {
      display: flex;
      gap: var(--spacing-md);
    }

    @media (max-width: 1024px) {
      .frameworks-grid {
        grid-template-columns: 1fr;
      }
      .overview-grid {
        grid-template-columns: repeat(2, 1fr);
      }
      .report-options {
        grid-template-columns: 1fr;
      }
    }
  `;K([c()],$.prototype,"_frameworks",2);K([c()],$.prototype,"_selectedReport",2);K([c()],$.prototype,"_selectedFramework",2);$=K([g("sc-compliance-page")],$);var st=Object.defineProperty,ot=Object.getOwnPropertyDescriptor,X=(e,t,a,i)=>{for(var r=i>1?void 0:i?ot(t,a):t,s=e.length-1,o;s>=0;s--)(o=e[s])&&(r=(i?o(t,a,r):o(r))||r);return i&&r&&st(t,a,r),r};const nt=[{id:"threat-summary",name:"威胁情报摘要",description:"汇总当前威胁情报状态和趋势分析",category:"威胁情报",icon:"alert-triangle"},{id:"incident-report",name:"安全事件报告",description:"详细记录安全事件的调查过程和处理结果",category:"事件响应",icon:"file-warning"},{id:"vuln-scan",name:"漏洞扫描报告",description:"系统漏洞扫描结果和修复建议",category:"漏洞管理",icon:"bug"},{id:"compliance-audit",name:"合规审计报告",description:"各合规框架的审计结果和状态",category:"合规审计",icon:"clipboard-check"},{id:"executive-summary",name:"高管摘要报告",description:"面向管理层的安全态势概览",category:"管理报告",icon:"briefcase"},{id:"asset-inventory",name:"资产清单报告",description:"IT 资产清单和安全状态",category:"资产管理",icon:"server"}],ct=[{id:"R001",name:"2024年3月威胁情报摘要",type:"threat-summary",createdAt:new Date("2024-03-05"),status:"completed",size:"2.3 MB"},{id:"R002",name:"INC-2024-001 事件报告",type:"incident-report",createdAt:new Date("2024-03-05"),status:"completed",size:"1.5 MB"},{id:"R003",name:"Q1 合规审计报告",type:"compliance-audit",createdAt:new Date("2024-03-01"),status:"completed",size:"5.2 MB"},{id:"R004",name:"漏洞扫描 - 生产环境",type:"vuln-scan",createdAt:new Date("2024-03-01"),status:"completed",size:"3.8 MB"},{id:"R005",name:"2月高管摘要",type:"executive-summary",createdAt:new Date("2024-02-28"),status:"completed",size:"1.2 MB"}];let S=class extends v{constructor(){super(...arguments),this._templates=nt,this._reports=ct,this._activeTab="templates"}_getIconPath(e){const t={"alert-triangle":"M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0zM12 9v4M12 17h.01","file-warning":"M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z",bug:"M8 2l1.88 1.88M14.12 3.88L16 2","clipboard-check":"M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2 M9 14l2 2 4-4",briefcase:"M16 20V4a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16 M20 20H4 M8 6h8",server:"M2 2h20v8H2zM2 14h20v8H2zM6 6h.01M6 18h.01"};return t[e]||t["file-warning"]}_formatDate(e){return e.toLocaleDateString("zh-CN",{year:"numeric",month:"2-digit",day:"2-digit"})}_getStatusLabel(e){return{completed:"已完成",generating:"生成中",failed:"失败"}[e]||e}render(){return n`
      <div class="page-header">
        <h1 class="page-title">分析报告</h1>
        <button class="btn btn-primary">+ 新建报告</button>
      </div>

      <div class="tabs">
        <button 
          class="tab ${this._activeTab==="templates"?"active":""}"
          @click=${()=>this._activeTab="templates"}
        >报告模板</button>
        <button 
          class="tab ${this._activeTab==="recent"?"active":""}"
          @click=${()=>this._activeTab="recent"}
        >最近报告</button>
        <button 
          class="tab ${this._activeTab==="scheduled"?"active":""}"
          @click=${()=>this._activeTab="scheduled"}
        >定时任务</button>
      </div>

      ${this._activeTab==="templates"?this._renderTemplates():""}
      ${this._activeTab==="recent"?this._renderRecentReports():""}
      ${this._activeTab==="scheduled"?this._renderScheduled():""}
    `}_renderTemplates(){return n`
      <div class="templates-grid">
        ${this._templates.map(e=>n`
          <div class="template-card">
            <div class="template-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d=${this._getIconPath(e.icon)}/>
              </svg>
            </div>
            <div class="template-name">${e.name}</div>
            <div class="template-category">${e.category}</div>
            <div class="template-desc">${e.description}</div>
          </div>
        `)}
      </div>
    `}_renderRecentReports(){return n`
      <table class="reports-table">
        <thead>
          <tr>
            <th>报告名称</th>
            <th>类型</th>
            <th>创建时间</th>
            <th>大小</th>
            <th>状态</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          ${this._reports.map(e=>n`
            <tr>
              <td><span class="report-name">${e.name}</span></td>
              <td>${this._templates.find(t=>t.id===e.type)?.name||e.type}</td>
              <td>${this._formatDate(e.createdAt)}</td>
              <td>${e.size}</td>
              <td>
                <span class="report-status status-${e.status}">
                  <span class="status-dot"></span>
                  ${this._getStatusLabel(e.status)}
                </span>
              </td>
              <td>
                <button class="btn-icon" title="下载">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                    <polyline points="7 10 12 15 17 10"/>
                    <line x1="12" y1="15" x2="12" y2="3"/>
                  </svg>
                </button>
                <button class="btn-icon" title="分享">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="18" cy="5" r="3"/>
                    <circle cx="6" cy="12" r="3"/>
                    <circle cx="18" cy="19" r="3"/>
                    <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/>
                    <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
                  </svg>
                </button>
                <button class="btn-icon" title="删除">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="3 6 5 6 21 6"/>
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                  </svg>
                </button>
              </td>
            </tr>
          `)}
        </tbody>
      </table>
    `}_renderScheduled(){return n`
      <div class="schedule-section">
        <h3 class="section-title">定时报告任务</h3>
        <div class="schedule-list">
          <div class="schedule-item">
            <div class="schedule-info">
              <div class="schedule-name">每周威胁情报摘要</div>
              <div class="schedule-frequency">每周一 09:00</div>
            </div>
            <button class="btn">编辑</button>
          </div>
          <div class="schedule-item">
            <div class="schedule-info">
              <div class="schedule-name">月度合规审计报告</div>
              <div class="schedule-frequency">每月1日 08:00</div>
            </div>
            <button class="btn">编辑</button>
          </div>
          <div class="schedule-item">
            <div class="schedule-info">
              <div class="schedule-name">季度高管摘要</div>
              <div class="schedule-frequency">每季度首日 08:00</div>
            </div>
            <button class="btn">编辑</button>
          </div>
        </div>
        <div style="margin-top: var(--spacing-lg);">
          <button class="btn btn-primary">+ 添加定时任务</button>
        </div>
      </div>
    `}};S.styles=p`
    :host {
      display: block;
    }

    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: var(--spacing-lg);
    }

    .page-title {
      font-size: 1.5rem;
      font-weight: 600;
    }

    .tabs {
      display: flex;
      gap: var(--spacing-md);
      margin-bottom: var(--spacing-lg);
      border-bottom: 1px solid var(--border-color);
      padding-bottom: var(--spacing-sm);
    }

    .tab {
      padding: var(--spacing-sm) var(--spacing-md);
      background: none;
      border: none;
      color: var(--text-muted);
      cursor: pointer;
      font-size: 0.875rem;
      border-bottom: 2px solid transparent;
      margin-bottom: -1px;
      transition: all var(--transition-fast);
    }

    .tab:hover {
      color: var(--text-primary);
    }

    .tab.active {
      color: var(--color-primary);
      border-bottom-color: var(--color-primary);
    }

    /* Templates Grid */
    .templates-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: var(--spacing-md);
    }

    .template-card {
      background: var(--bg-card);
      border: 1px solid var(--border-color);
      border-radius: var(--border-radius);
      padding: var(--spacing-lg);
      cursor: pointer;
      transition: all var(--transition-fast);
    }

    .template-card:hover {
      border-color: var(--color-primary);
      transform: translateY(-2px);
    }

    .template-icon {
      width: 48px;
      height: 48px;
      background: rgba(59, 130, 246, 0.1);
      border-radius: var(--border-radius);
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: var(--spacing-md);
      color: var(--color-primary);
    }

    .template-name {
      font-weight: 600;
      margin-bottom: var(--spacing-xs);
    }

    .template-category {
      font-size: 0.75rem;
      color: var(--text-muted);
      margin-bottom: var(--spacing-sm);
    }

    .template-desc {
      font-size: 0.875rem;
      color: var(--text-secondary);
    }

    /* Reports Table */
    .reports-table {
      width: 100%;
      background: var(--bg-card);
      border: 1px solid var(--border-color);
      border-radius: var(--border-radius);
      overflow: hidden;
    }

    .reports-table th,
    .reports-table td {
      padding: var(--spacing-md);
      text-align: left;
      border-bottom: 1px solid var(--border-color);
    }

    .reports-table th {
      background: var(--bg-secondary);
      font-weight: 600;
      font-size: 0.75rem;
      text-transform: uppercase;
      color: var(--text-muted);
    }

    .reports-table tr:last-child td {
      border-bottom: none;
    }

    .reports-table tr:hover td {
      background: var(--bg-hover);
    }

    .report-name {
      font-weight: 500;
    }

    .report-status {
      display: inline-flex;
      align-items: center;
      gap: var(--spacing-xs);
      padding: 2px 8px;
      border-radius: 9999px;
      font-size: 0.75rem;
    }

    .status-completed { background: rgba(16, 185, 129, 0.2); color: var(--color-success); }
    .status-generating { background: rgba(245, 158, 11, 0.2); color: var(--color-warning); }
    .status-failed { background: rgba(239, 68, 68, 0.2); color: var(--color-danger); }

    .status-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: currentColor;
    }

    .status-generating .status-dot {
      animation: pulse 1.5s infinite;
    }

    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.5; }
    }

    .btn-icon {
      padding: var(--spacing-xs);
      background: none;
      border: none;
      color: var(--text-muted);
      cursor: pointer;
      border-radius: 4px;
      transition: all var(--transition-fast);
    }

    .btn-icon:hover {
      background: var(--bg-tertiary);
      color: var(--text-primary);
    }

    .btn {
      padding: var(--spacing-sm) var(--spacing-lg);
      border-radius: var(--border-radius);
      border: 1px solid var(--border-color);
      background: var(--bg-tertiary);
      color: var(--text-secondary);
      cursor: pointer;
      font-size: 0.875rem;
      transition: all var(--transition-fast);
    }

    .btn:hover {
      background: var(--bg-hover);
      color: var(--text-primary);
    }

    .btn-primary {
      background: var(--color-primary);
      border-color: var(--color-primary);
      color: white;
    }

    .btn-primary:hover {
      background: var(--color-primary-dark);
    }

    /* Schedule Section */
    .schedule-section {
      margin-top: var(--spacing-xl);
      background: var(--bg-card);
      border: 1px solid var(--border-color);
      border-radius: var(--border-radius);
      padding: var(--spacing-lg);
    }

    .section-title {
      font-size: 1.125rem;
      font-weight: 600;
      margin-bottom: var(--spacing-md);
    }

    .schedule-list {
      display: flex;
      flex-direction: column;
      gap: var(--spacing-sm);
    }

    .schedule-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: var(--spacing-md);
      background: var(--bg-tertiary);
      border-radius: var(--border-radius);
    }

    .schedule-info {
      display: flex;
      align-items: center;
      gap: var(--spacing-md);
    }

    .schedule-name {
      font-weight: 500;
    }

    .schedule-frequency {
      font-size: 0.875rem;
      color: var(--text-muted);
    }

    @media (max-width: 1024px) {
      .templates-grid {
        grid-template-columns: repeat(2, 1fr);
      }
    }

    @media (max-width: 768px) {
      .templates-grid {
        grid-template-columns: 1fr;
      }
    }
  `;X([c()],S.prototype,"_templates",2);X([c()],S.prototype,"_reports",2);X([c()],S.prototype,"_activeTab",2);S=X([g("sc-reports-page")],S);var lt=Object.defineProperty,dt=Object.getOwnPropertyDescriptor,ae=(e,t,a,i)=>{for(var r=i>1?void 0:i?dt(t,a):t,s=e.length-1,o;s>=0;s--)(o=e[s])&&(r=(i?o(t,a,r):o(r))||r);return i&&r&&lt(t,a,r),r};const ne=[{id:"general",title:"常规设置",icon:"settings"},{id:"security",title:"安全设置",icon:"shield"},{id:"notifications",title:"通知设置",icon:"bell"},{id:"integrations",title:"集成配置",icon:"plug"},{id:"api",title:"API 设置",icon:"code"},{id:"about",title:"关于",icon:"info"}];let I=class extends v{constructor(){super(...arguments),this._activeSection="general",this._settings={siteName:"SecuClaw",language:"zh-CN",timezone:"Asia/Shanghai",twoFactorEnabled:!0,sessionTimeout:30,notificationsEmail:!0,notificationsSlack:!1,notificationsWeb:!0}}_getIconPath(e){const t={settings:"M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z",shield:"M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z",bell:"M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 0 1-3.46 0",plug:"M12 22v-5M9 8V2M15 8V2M18 8v5a4 4 0 0 1-4 4h-4a4 4 0 0 1-4-4V8h12z",code:"M16 18l6-6-6-6M8 6l-6 6 6 6",info:"M12 22C6.48 22 2 17.52 2 12S6.48 2 12 2s10 4.48 10 10-4.48 10-10 10zM12 16v-4M12 8h.01"};return t[e]||t.settings}_renderSectionContent(){switch(this._activeSection){case"general":return n`
          <div class="setting-group">
            <label class="setting-label">站点名称</label>
            <p class="setting-description">显示在浏览器标题栏和页面标题中</p>
            <input type="text" class="setting-input" .value=${this._settings.siteName} />
          </div>
          <div class="form-row">
            <div class="setting-group">
              <label class="setting-label">语言</label>
              <select class="setting-input">
                <option value="zh-CN" ?selected=${this._settings.language==="zh-CN"}>简体中文</option>
                <option value="en-US" ?selected=${this._settings.language==="en-US"}>English</option>
              </select>
            </div>
            <div class="setting-group">
              <label class="setting-label">时区</label>
              <select class="setting-input">
                <option value="Asia/Shanghai" ?selected=${this._settings.timezone==="Asia/Shanghai"}>Asia/Shanghai (UTC+8)</option>
                <option value="UTC" ?selected=${this._settings.timezone==="UTC"}>UTC</option>
              </select>
            </div>
          </div>
        `;case"security":return n`
          <div class="setting-group">
            <div class="setting-toggle">
              <div 
                class="toggle-switch ${this._settings.twoFactorEnabled?"active":""}"
                @click=${()=>this._settings={...this._settings,twoFactorEnabled:!this._settings.twoFactorEnabled}}
              ></div>
              <span>启用双因素认证</span>
            </div>
            <p class="setting-description">为账户添加额外的安全保护层</p>
          </div>
          <div class="setting-group">
            <label class="setting-label">会话超时时间 (分钟)</label>
            <p class="setting-description">用户无操作后自动登出的时间</p>
            <input type="number" class="setting-input" .value=${String(this._settings.sessionTimeout)} />
          </div>
        `;case"notifications":return n`
          <div class="setting-group">
            <div class="setting-toggle">
              <div 
                class="toggle-switch ${this._settings.notificationsEmail?"active":""}"
                @click=${()=>this._settings={...this._settings,notificationsEmail:!this._settings.notificationsEmail}}
              ></div>
              <span>邮件通知</span>
            </div>
            <p class="setting-description">通过邮件接收安全告警</p>
          </div>
          <div class="setting-group">
            <div class="setting-toggle">
              <div 
                class="toggle-switch ${this._settings.notificationsSlack?"active":""}"
                @click=${()=>this._settings={...this._settings,notificationsSlack:!this._settings.notificationsSlack}}
              ></div>
              <span>Slack 通知</span>
            </div>
            <p class="setting-description">通过 Slack 接收安全告警</p>
          </div>
          <div class="setting-group">
            <div class="setting-toggle">
              <div 
                class="toggle-switch ${this._settings.notificationsWeb?"active":""}"
                @click=${()=>this._settings={...this._settings,notificationsWeb:!this._settings.notificationsWeb}}
              ></div>
              <span>Web 通知</span>
            </div>
            <p class="setting-description">在浏览器中显示通知</p>
          </div>
        `;case"api":return n`
          <div class="setting-group">
            <label class="setting-label">API 密钥</label>
            <p class="setting-description">用于访问 SecuClaw API 的密钥</p>
            <div class="api-key-display">
              <code class="api-key">sk-****************************</code>
              <button class="btn-icon" title="复制">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                </svg>
              </button>
              <button class="btn-icon" title="重新生成">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M23 4v6h-6M1 20v-6h6"/>
                  <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
                </svg>
              </button>
            </div>
          </div>
        `;case"about":return n`
          <div class="setting-group">
            <label class="setting-label">SecuClaw 安爪安全平台</label>
            <p class="setting-description">AI 驱动的企业安全运营平台</p>
            <p style="margin-top: var(--spacing-md);">
              <strong>版本:</strong> 1.0.0<br/>
              <strong>构建日期:</strong> ${new Date().toLocaleDateString("zh-CN")}<br/>
              <strong>许可证:</strong> MIT
            </p>
          </div>
        `;default:return n`<p>选择一个设置类别</p>`}}render(){return n`
      <div class="settings-layout">
        <!-- Settings Navigation -->
        <nav class="settings-nav">
          ${ne.map(e=>n`
            <div 
              class="nav-item ${this._activeSection===e.id?"active":""}"
              @click=${()=>this._activeSection=e.id}
            >
              <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d=${this._getIconPath(e.icon)}/>
              </svg>
              ${e.title}
            </div>
          `)}
        </nav>

        <!-- Settings Content -->
        <div class="settings-content">
          <h2 class="section-title">
            ${ne.find(e=>e.id===this._activeSection)?.title||"设置"}
          </h2>
          
          ${this._renderSectionContent()}

          <div style="margin-top: var(--spacing-xl);">
            <button class="btn-save">保存更改</button>
          </div>
        </div>
      </div>
    `}};I.styles=p`
    :host {
      display: block;
    }

    .settings-layout {
      display: grid;
      grid-template-columns: 250px 1fr;
      gap: var(--spacing-lg);
    }

    .settings-nav {
      background: var(--bg-card);
      border: 1px solid var(--border-color);
      border-radius: var(--border-radius);
      padding: var(--spacing-sm);
    }

    .nav-item {
      display: flex;
      align-items: center;
      gap: var(--spacing-sm);
      padding: var(--spacing-sm) var(--spacing-md);
      border-radius: var(--border-radius);
      cursor: pointer;
      color: var(--text-secondary);
      transition: all var(--transition-fast);
    }

    .nav-item:hover {
      background: var(--bg-hover);
      color: var(--text-primary);
    }

    .nav-item.active {
      background: rgba(59, 130, 246, 0.1);
      color: var(--color-primary);
    }

    .nav-icon {
      width: 18px;
      height: 18px;
    }

    .settings-content {
      background: var(--bg-card);
      border: 1px solid var(--border-color);
      border-radius: var(--border-radius);
      padding: var(--spacing-lg);
    }

    .section-title {
      font-size: 1.25rem;
      font-weight: 600;
      margin-bottom: var(--spacing-lg);
      padding-bottom: var(--spacing-md);
      border-bottom: 1px solid var(--border-color);
    }

    .setting-group {
      margin-bottom: var(--spacing-lg);
    }

    .setting-label {
      font-weight: 500;
      margin-bottom: var(--spacing-xs);
    }

    .setting-description {
      font-size: 0.875rem;
      color: var(--text-muted);
      margin-bottom: var(--spacing-sm);
    }

    .setting-input {
      width: 100%;
      max-width: 400px;
    }

    .setting-toggle {
      display: flex;
      align-items: center;
      gap: var(--spacing-sm);
    }

    .toggle-switch {
      position: relative;
      width: 44px;
      height: 24px;
      background: var(--bg-tertiary);
      border-radius: 12px;
      cursor: pointer;
      transition: background var(--transition-fast);
    }

    .toggle-switch.active {
      background: var(--color-primary);
    }

    .toggle-switch::after {
      content: '';
      position: absolute;
      top: 2px;
      left: 2px;
      width: 20px;
      height: 20px;
      background: white;
      border-radius: 50%;
      transition: transform var(--transition-fast);
    }

    .toggle-switch.active::after {
      transform: translateX(20px);
    }

    .btn-save {
      background: var(--color-primary);
      color: white;
      padding: var(--spacing-sm) var(--spacing-lg);
      border-radius: var(--border-radius);
      border: none;
      cursor: pointer;
      font-weight: 500;
      transition: background var(--transition-fast);
    }

    .btn-save:hover {
      background: var(--color-primary-dark);
    }

    .form-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: var(--spacing-md);
    }

    .api-key-display {
      display: flex;
      gap: var(--spacing-sm);
      align-items: center;
    }

    .api-key {
      font-family: monospace;
      background: var(--bg-tertiary);
      padding: var(--spacing-sm) var(--spacing-md);
      border-radius: var(--border-radius);
      flex: 1;
    }

    .btn-icon {
      padding: var(--spacing-sm);
      background: var(--bg-tertiary);
      border: 1px solid var(--border-color);
      border-radius: var(--border-radius);
      cursor: pointer;
      color: var(--text-secondary);
      transition: all var(--transition-fast);
    }

    .btn-icon:hover {
      background: var(--bg-hover);
      color: var(--text-primary);
    }
  `;ae([c()],I.prototype,"_activeSection",2);ae([c()],I.prototype,"_settings",2);I=ae([g("sc-settings-page")],I);var pt=Object.defineProperty,vt=Object.getOwnPropertyDescriptor,ie=(e,t,a,i)=>{for(var r=i>1?void 0:i?vt(t,a):t,s=e.length-1,o;s>=0;s--)(o=e[s])&&(r=(i?o(t,a,r):o(r))||r);return i&&r&&pt(t,a,r),r};let E=class extends v{constructor(){super(...arguments),this.threatId="",this._threat=this._getMockThreat()}_getMockThreat(){return{id:"T001",name:"APT28 鱼叉式钓鱼攻击活动",type:"APT",severity:"critical",status:"active",description:"APT28（又称 Fancy Bear、Sofacy）是一个与俄罗斯军事情报机构相关的网络间谍组织。该组织自2000年代中期以来一直活跃，主要针对政府、军事和安全机构进行网络间谍活动。本次攻击活动使用鱼叉式钓鱼邮件作为初始入侵手段，邮件伪装成合法的组织或个人，诱导目标打开恶意附件或点击恶意链接。",iocs:[{type:"ip",value:"192.168.1.100",confidence:"high",firstSeen:new Date("2024-01-15"),lastSeen:new Date("2024-03-01"),sources:["VirusTotal","AlienVault"]},{type:"domain",value:"secure-login-microsoft.com",confidence:"high",firstSeen:new Date("2024-01-20"),lastSeen:new Date("2024-03-01"),sources:["VirusTotal"]},{type:"hash",value:"a1b2c3d4e5f6789012345678901234567890abcd",confidence:"high",firstSeen:new Date("2024-02-01"),lastSeen:new Date("2024-02-28"),sources:["Hybrid Analysis"]},{type:"url",value:"https://secure-login-microsoft.com/office365/login",confidence:"medium",firstSeen:new Date("2024-02-05"),lastSeen:new Date("2024-03-01"),sources:["PhishTank"]},{type:"email",value:"support@microsoft-services.com",confidence:"medium",firstSeen:new Date("2024-01-25"),lastSeen:new Date("2024-02-20"),sources:["Internal"]}],relatedThreats:[{id:"T002",name:"Emotet 僵尸网络变种",similarity:.65},{id:"T003",name:"TrickBot 银行木马",similarity:.45},{id:"T004",name:"Ryuk 勒索软件",similarity:.35}],mitreTechniques:[{id:"T1566.001",name:"Spearphishing Attachment",tactics:["Initial Access"]},{id:"T1566.002",name:"Spearphishing Link",tactics:["Initial Access"]},{id:"T1059.001",name:"PowerShell",tactics:["Execution"]},{id:"T1055",name:"Process Injection",tactics:["Defense Evasion","Privilege Escalation"]},{id:"T1071.001",name:"Web Protocols",tactics:["Command and Control"]}],tags:["APT","俄罗斯","鱼叉式钓鱼","间谍活动","政府目标"],confidence:92,firstSeen:new Date("2024-01-15"),lastSeen:new Date("2024-03-01"),affectedSystems:["Windows Workstations","Microsoft 365","Active Directory"],killChain:[{phase:"侦察",status:"detected"},{phase:"武器化",status:"detected"},{phase:"交付",status:"detected"},{phase:"利用",status:"detected"},{phase:"安装",status:"prevented"},{phase:"命令控制",status:"prevented"},{phase:"目标达成",status:"unknown"}]}}_getIOCTypeIcon(e){const t={ip:"M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5",domain:"M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0zM9 12h6M12 9v6",url:"M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71",hash:"M4 4h16v16H4zM9 9h6v6H9z",email:"M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2zM22 6l-10 7L2 6"};return t[e]||t.ip}_getConfidenceClass(e){return e>=80?"score-high":e>=50?"score-medium":"score-low"}render(){const e=this._threat;return n`
      <div class="header-section">
        <div>
          <h1 class="threat-title">${e.name}</h1>
          <div class="threat-id">${e.id} · 首次发现: ${e.firstSeen.toLocaleDateString("zh-CN")}</div>
        </div>
        <div class="badges">
          <span class="badge severity-${e.severity}">
            ${e.severity==="critical"?"严重":e.severity==="high"?"高":e.severity==="medium"?"中":"低"}
          </span>
          <span class="badge" style="background: var(--bg-tertiary); color: var(--text-secondary);">
            ${e.status==="active"?"活跃":e.status==="mitigated"?"已缓解":"误报"}
          </span>
        </div>
      </div>

      <div class="detail-container">
        <div class="main-panel">
          <!-- Description -->
          <div class="card">
            <h3 class="card-title">描述</h3>
            <p class="description">${e.description}</p>
            <div class="tags-container" style="margin-top: var(--spacing-md);">
              ${e.tags.map(t=>n`<span class="tag">${t}</span>`)}
            </div>
          </div>

          <!-- IOCs -->
          <div class="card">
            <h3 class="card-title">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="8" x2="12" y2="12"/>
                <line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              IOC 指标 (${e.iocs.length})
            </h3>
            <table class="ioc-table">
              <thead>
                <tr>
                  <th>类型</th>
                  <th>值</th>
                  <th>可信度</th>
                  <th>最后发现</th>
                  <th>来源</th>
                </tr>
              </thead>
              <tbody>
                ${e.iocs.map(t=>n`
                  <tr>
                    <td>
                      <span class="ioc-type">
                        <svg class="type-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                          <path d=${this._getIOCTypeIcon(t.type)}/>
                        </svg>
                        ${t.type.toUpperCase()}
                      </span>
                    </td>
                    <td><code class="ioc-value">${t.value}</code></td>
                    <td class="confidence-${t.confidence}">
                      ${t.confidence==="high"?"高":t.confidence==="medium"?"中":"低"}
                    </td>
                    <td>${t.lastSeen.toLocaleDateString("zh-CN")}</td>
                    <td>${t.sources.join(", ")}</td>
                  </tr>
                `)}
              </tbody>
            </table>
          </div>

          <!-- MITRE ATT&CK -->
          <div class="card">
            <h3 class="card-title">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polygon points="12 2 22 8.5 22 15.5 12 22 2 15.5 2 8.5 12 2"/>
                <line x1="12" y1="22" x2="12" y2="15.5"/>
                <polyline points="22 8.5 12 15.5 2 8.5"/>
              </svg>
              MITRE ATT&CK 技术
            </h3>
            <div class="mitre-grid">
              ${e.mitreTechniques.map(t=>n`
                <div class="mitre-item">
                  <div class="mitre-id">${t.id}</div>
                  <div class="mitre-name">${t.name}</div>
                  <div class="mitre-tactics">
                    ${t.tactics.map(a=>n`<span class="tactic-tag">${a}</span>`)}
                  </div>
                </div>
              `)}
            </div>
          </div>

          <!-- Actions -->
          <div class="actions-bar">
            <button class="btn btn-primary">创建事件</button>
            <button class="btn">导出 IOC</button>
            <button class="btn">添加到黑名单</button>
            <button class="btn btn-danger">标记为误报</button>
          </div>
        </div>

        <div class="side-panel">
          <!-- Confidence Score -->
          <div class="card">
            <h3 class="card-title">威胁可信度</h3>
            <div class="confidence-score">
              <div class="score-circle ${this._getConfidenceClass(e.confidence)}">
                ${e.confidence}%
              </div>
              <div>
                <div style="font-weight: 600;">高可信度</div>
                <div class="score-label">基于 ${e.iocs.length} 个 IOC</div>
              </div>
            </div>
          </div>

          <!-- Kill Chain -->
          <div class="card">
            <h3 class="card-title">攻击链分析</h3>
            <div class="kill-chain">
              ${e.killChain.map(t=>n`
                <div class="kill-chain-phase">
                  <div class="phase-indicator phase-${t.status}"></div>
                  <span class="phase-name">${t.phase}</span>
                  <span class="phase-status">
                    ${t.status==="detected"?"已检测":t.status==="prevented"?"已阻止":"未知"}
                  </span>
                </div>
              `)}
            </div>
          </div>

          <!-- Related Threats -->
          <div class="card">
            <h3 class="card-title">关联威胁</h3>
            <div class="related-list">
              ${e.relatedThreats.map(t=>n`
                <div class="related-item">
                  <div>
                    <div style="font-size: 0.875rem;">${t.name}</div>
                    <div style="font-size: 0.75rem; color: var(--text-muted);">${t.id}</div>
                  </div>
                  <div class="similarity-bar">
                    <div class="similarity-fill" style="width: ${t.similarity*100}%"></div>
                  </div>
                </div>
              `)}
            </div>
          </div>

          <!-- Affected Systems -->
          <div class="card">
            <h3 class="card-title">影响系统</h3>
            <div class="tags-container">
              ${e.affectedSystems.map(t=>n`<span class="tag">${t}</span>`)}
            </div>
          </div>
        </div>
      </div>
    `}};E.styles=p`
    :host {
      display: block;
    }

    .detail-container {
      display: grid;
      grid-template-columns: 2fr 1fr;
      gap: var(--spacing-lg);
    }

    .main-panel {
      display: flex;
      flex-direction: column;
      gap: var(--spacing-lg);
    }

    .side-panel {
      display: flex;
      flex-direction: column;
      gap: var(--spacing-lg);
    }

    .card {
      background: var(--bg-card);
      border: 1px solid var(--border-color);
      border-radius: var(--border-radius);
      padding: var(--spacing-lg);
    }

    .card-title {
      font-size: 1rem;
      font-weight: 600;
      margin-bottom: var(--spacing-md);
      display: flex;
      align-items: center;
      gap: var(--spacing-sm);
    }

    .header-section {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: var(--spacing-lg);
    }

    .threat-title {
      font-size: 1.5rem;
      font-weight: 600;
    }

    .threat-id {
      font-family: monospace;
      font-size: 0.875rem;
      color: var(--text-muted);
      margin-top: var(--spacing-xs);
    }

    .badges {
      display: flex;
      gap: var(--spacing-sm);
    }

    .badge {
      padding: 4px 12px;
      border-radius: 9999px;
      font-size: 0.75rem;
      font-weight: 500;
    }

    .severity-critical { background: rgba(239, 68, 68, 0.2); color: var(--color-danger); }
    .severity-high { background: rgba(245, 158, 11, 0.2); color: var(--color-warning); }
    .severity-medium { background: rgba(6, 182, 212, 0.2); color: var(--color-info); }
    .severity-low { background: rgba(16, 185, 129, 0.2); color: var(--color-success); }

    .description {
      color: var(--text-secondary);
      line-height: 1.6;
    }

    /* IOC Table */
    .ioc-table {
      width: 100%;
      border-collapse: collapse;
    }

    .ioc-table th,
    .ioc-table td {
      padding: var(--spacing-sm) var(--spacing-md);
      text-align: left;
      border-bottom: 1px solid var(--border-color);
      font-size: 0.875rem;
    }

    .ioc-table th {
      color: var(--text-muted);
      font-weight: 500;
      text-transform: uppercase;
      font-size: 0.75rem;
    }

    .ioc-value {
      font-family: monospace;
      background: var(--bg-tertiary);
      padding: 2px 6px;
      border-radius: 4px;
      word-break: break-all;
    }

    .ioc-type {
      display: inline-flex;
      align-items: center;
      gap: var(--spacing-xs);
    }

    .type-icon {
      width: 16px;
      height: 16px;
      opacity: 0.7;
    }

    .confidence-high { color: var(--color-success); }
    .confidence-medium { color: var(--color-warning); }
    .confidence-low { color: var(--color-danger); }

    /* MITRE ATT&CK */
    .mitre-grid {
      display: flex;
      flex-direction: column;
      gap: var(--spacing-sm);
    }

    .mitre-item {
      background: var(--bg-tertiary);
      border-radius: var(--border-radius);
      padding: var(--spacing-sm) var(--spacing-md);
    }

    .mitre-id {
      font-family: monospace;
      font-size: 0.75rem;
      color: var(--color-primary);
    }

    .mitre-name {
      font-weight: 500;
      margin-top: var(--spacing-xs);
    }

    .mitre-tactics {
      display: flex;
      flex-wrap: wrap;
      gap: var(--spacing-xs);
      margin-top: var(--spacing-xs);
    }

    .tactic-tag {
      font-size: 0.625rem;
      background: var(--bg-secondary);
      padding: 2px 6px;
      border-radius: 4px;
      color: var(--text-muted);
    }

    /* Related Threats */
    .related-list {
      display: flex;
      flex-direction: column;
      gap: var(--spacing-sm);
    }

    .related-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: var(--spacing-sm);
      background: var(--bg-tertiary);
      border-radius: var(--border-radius);
      cursor: pointer;
      transition: background var(--transition-fast);
    }

    .related-item:hover {
      background: var(--bg-hover);
    }

    .similarity-bar {
      width: 60px;
      height: 4px;
      background: var(--bg-secondary);
      border-radius: 2px;
      overflow: hidden;
    }

    .similarity-fill {
      height: 100%;
      background: var(--color-primary);
    }

    /* Kill Chain */
    .kill-chain {
      display: flex;
      flex-direction: column;
      gap: var(--spacing-xs);
    }

    .kill-chain-phase {
      display: flex;
      align-items: center;
      gap: var(--spacing-sm);
      padding: var(--spacing-xs) 0;
    }

    .phase-indicator {
      width: 12px;
      height: 12px;
      border-radius: 50%;
      flex-shrink: 0;
    }

    .phase-detected { background: var(--color-warning); }
    .phase-prevented { background: var(--color-success); }
    .phase-unknown { background: var(--bg-tertiary); }

    .phase-name {
      flex: 1;
      font-size: 0.875rem;
    }

    .phase-status {
      font-size: 0.75rem;
      color: var(--text-muted);
    }

    /* Actions */
    .actions-bar {
      display: flex;
      gap: var(--spacing-sm);
      margin-top: var(--spacing-lg);
    }

    .btn {
      padding: var(--spacing-sm) var(--spacing-md);
      border-radius: var(--border-radius);
      border: 1px solid var(--border-color);
      background: var(--bg-tertiary);
      color: var(--text-secondary);
      cursor: pointer;
      font-size: 0.875rem;
      transition: all var(--transition-fast);
    }

    .btn:hover {
      background: var(--bg-hover);
      color: var(--text-primary);
    }

    .btn-primary {
      background: var(--color-primary);
      border-color: var(--color-primary);
      color: white;
    }

    .btn-primary:hover {
      background: var(--color-primary-dark);
    }

    .btn-danger {
      border-color: var(--color-danger);
      color: var(--color-danger);
    }

    .btn-danger:hover {
      background: rgba(239, 68, 68, 0.1);
    }

    /* Tags */
    .tags-container {
      display: flex;
      flex-wrap: wrap;
      gap: var(--spacing-xs);
    }

    .tag {
      background: var(--bg-tertiary);
      padding: 2px 8px;
      border-radius: 4px;
      font-size: 0.75rem;
      color: var(--text-secondary);
    }

    /* Confidence Score */
    .confidence-score {
      display: flex;
      align-items: center;
      gap: var(--spacing-md);
    }

    .score-circle {
      width: 80px;
      height: 80px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.5rem;
      font-weight: 700;
    }

    .score-high { background: rgba(16, 185, 129, 0.2); color: var(--color-success); }
    .score-medium { background: rgba(245, 158, 11, 0.2); color: var(--color-warning); }
    .score-low { background: rgba(239, 68, 68, 0.2); color: var(--color-danger); }

    .score-label {
      color: var(--text-muted);
      font-size: 0.875rem;
    }

    @media (max-width: 1024px) {
      .detail-container {
        grid-template-columns: 1fr;
      }
    }
  `;ie([h({type:String})],E.prototype,"threatId",2);ie([c()],E.prototype,"_threat",2);E=ie([g("sc-threat-detail")],E);var gt=Object.defineProperty,ut=Object.getOwnPropertyDescriptor,M=(e,t,a,i)=>{for(var r=i>1?void 0:i?ut(t,a):t,s=e.length-1,o;s>=0;s--)(o=e[s])&&(r=(i?o(t,a,r):o(r))||r);return i&&r&&gt(t,a,r),r};const ht={symbol:Symbol("gateway")},mt={"/":"dashboard","/threats":"threats","/incidents":"incidents","/vulnerabilities":"vulnerabilities","/compliance":"compliance","/reports":"reports","/settings":"settings"},bt=["/login"];let y=class extends v{constructor(){super(...arguments),this.gatewayState=Z({connected:!1,url:"ws://127.0.0.1:21981"}),this._sidebarCollapsed=!1,this._currentPath="/",this._activeNavItem="dashboard",this._isAuthenticated=!1}connectedCallback(){super.connectedCallback(),this._checkAuth(),this._initRouter()}disconnectedCallback(){super.disconnectedCallback(),this._gatewayClient?.close()}async _checkAuth(){const e=await T.checkAuth();this._isAuthenticated=e,e&&this._initGateway()}_initRouter(){We();const e=()=>{const t=H.get();if(t){if(this._currentPath=t.path,!bt.includes(t.path)&&!this._isAuthenticated){U("/login");return}this._activeNavItem=mt[t.path]||"dashboard"}};e(),window.addEventListener("hashchange",e)}async _initGateway(){const{SecuClawGatewayClient:e}=await ye(async()=>{const{SecuClawGatewayClient:a}=await import("./gateway-client-BLishm8W.js");return{SecuClawGatewayClient:a}},[],import.meta.url),t=this.gatewayState.get().url;this._gatewayClient=new e({url:t,onConnect:()=>{this.gatewayState.set({...this.gatewayState.get(),connected:!0})},onDisconnect:()=>{this.gatewayState.set({...this.gatewayState.get(),connected:!1})},onError:a=>{console.error("Gateway connection error:",a)}}),this._gatewayClient.connect()}_toggleSidebar(){this._sidebarCollapsed=!this._sidebarCollapsed}_handleNavChange(e){const t=e.detail.item.id,i={dashboard:"/",threats:"/threats",incidents:"/incidents",vulnerabilities:"/vulnerabilities",compliance:"/compliance",reports:"/reports",settings:"/settings"}[t]||"/";U(i)}_handleLogout(){T.logout(),this._isAuthenticated=!1,U("/login")}_renderPage(){const e=H.get(),t=e?.path||"/",a=e?.params;switch(t){case"/login":return n`<sc-login-page></sc-login-page>`;case"/":return n`<sc-dashboard></sc-dashboard>`;case"/threats":return n`<sc-threats-page></sc-threats-page>`;case"/incidents":return n`<sc-incidents-page></sc-incidents-page>`;case"/vulnerabilities":return n`<sc-vulnerabilities-page></sc-vulnerabilities-page>`;case"/compliance":return n`<sc-compliance-page></sc-compliance-page>`;case"/reports":return n`<sc-reports-page></sc-reports-page>`;case"/settings":return n`<sc-settings-page></sc-settings-page>`;default:return t.startsWith("/threats/")&&a?.id?n`<sc-threat-detail threatId=${a.id}></sc-threat-detail>`:n`<sc-dashboard></sc-dashboard>`}}render(){if((H.get()?.path||"/")==="/login"||!this._isAuthenticated)return n`
        <sc-notifications></sc-notifications>
        ${this._renderPage()}
      `;const a=this.gatewayState.get(),i=T.getState().user;return n`
      <div class="app-container">
        <!-- Notifications -->
        <sc-notifications></sc-notifications>

        <!-- Connection Status Bar -->
        <div class="connection-bar">
          <span 
            class="connection-indicator ${a.connected?"connected":"connecting"}"
          ></span>
          <span>
            ${a.connected?`已连接到 ${a.url}`:`正在连接 ${a.url}...`}
          </span>
          <span style="margin-left: auto;">
            ${i?n`
              <span class="user-info">
                <span class="user-avatar">${i.username[0].toUpperCase()}</span>
                <span class="user-name">${i.username}</span>
                <button class="logout-btn" @click=${this._handleLogout}>退出</button>
              </span>
            `:""}
          </span>
        </div>

        <!-- Header -->
        <sc-header 
          @toggle-sidebar=${this._toggleSidebar}
        ></sc-header>

        <!-- Main Body -->
        <div class="app-body">
          <!-- Sidebar -->
          <sc-sidebar 
            ?collapsed=${this._sidebarCollapsed}
            .activeItem=${this._activeNavItem}
            @nav-change=${this._handleNavChange}
          ></sc-sidebar>

          <!-- Main Content Area -->
          <main class="main-content">
            ${this._renderPage()}
          </main>
        </div>
      </div>
    `}};y.styles=p`
    :host {
      display: block;
      min-height: 100vh;
    }

    .app-container {
      display: flex;
      flex-direction: column;
      min-height: 100vh;
    }

    .app-body {
      display: flex;
      flex: 1;
      overflow: hidden;
    }

    .main-content {
      flex: 1;
      padding: var(--spacing-lg);
      overflow-y: auto;
      background: var(--bg-primary);
    }

    /* Connection status bar */
    .connection-bar {
      background: var(--bg-secondary);
      border-bottom: 1px solid var(--border-color);
      padding: var(--spacing-xs) var(--spacing-md);
      display: flex;
      align-items: center;
      gap: var(--spacing-sm);
      font-size: 0.75rem;
      color: var(--text-muted);
    }

    .connection-indicator {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: var(--color-danger);
    }

    .connection-indicator.connected {
      background: var(--color-success);
    }

    .connection-indicator.connecting {
      background: var(--color-warning);
      animation: pulse 1.5s infinite;
    }

    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.5; }
    }

    /* User info in header */
    .user-info {
      display: flex;
      align-items: center;
      gap: var(--spacing-sm);
      padding: var(--spacing-xs) var(--spacing-sm);
      border-radius: var(--border-radius);
      cursor: pointer;
      transition: background var(--transition-fast);
    }

    .user-info:hover {
      background: var(--bg-hover);
    }

    .user-avatar {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      background: var(--color-primary);
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-size: 0.875rem;
      font-weight: 600;
    }

    .user-name {
      font-size: 0.875rem;
      color: var(--text-primary);
    }

    .logout-btn {
      background: none;
      border: none;
      color: var(--text-muted);
      cursor: pointer;
      padding: var(--spacing-xs);
      font-size: 0.75rem;
    }

    .logout-btn:hover {
      color: var(--color-danger);
    }
  `;M([he({context:ht}),c()],y.prototype,"gatewayState",2);M([c()],y.prototype,"_sidebarCollapsed",2);M([c()],y.prototype,"_currentPath",2);M([c()],y.prototype,"_activeNavItem",2);M([c()],y.prototype,"_isAuthenticated",2);y=M([g("secuclaw-app")],y);
//# sourceMappingURL=index-Mp4lpIR1.js.map
