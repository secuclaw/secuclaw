(function(){const e=document.createElement("link").relList;if(e&&e.supports&&e.supports("modulepreload"))return;for(const r of document.querySelectorAll('link[rel="modulepreload"]'))s(r);new MutationObserver(r=>{for(const n of r)if(n.type==="childList")for(const a of n.addedNodes)a.tagName==="LINK"&&a.rel==="modulepreload"&&s(a)}).observe(document,{childList:!0,subtree:!0});function i(r){const n={};return r.integrity&&(n.integrity=r.integrity),r.referrerPolicy&&(n.referrerPolicy=r.referrerPolicy),r.crossOrigin==="use-credentials"?n.credentials="include":r.crossOrigin==="anonymous"?n.credentials="omit":n.credentials="same-origin",n}function s(r){if(r.ep)return;r.ep=!0;const n=i(r);fetch(r.href,n)}})();/**
 * @license
 * Copyright 2019 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */const Y=globalThis,ke=Y.ShadowRoot&&(Y.ShadyCSS===void 0||Y.ShadyCSS.nativeShadow)&&"adoptedStyleSheets"in Document.prototype&&"replace"in CSSStyleSheet.prototype,Se=Symbol(),Ee=new WeakMap;let Ve=class{constructor(e,i,s){if(this._$cssResult$=!0,s!==Se)throw Error("CSSResult is not constructable. Use `unsafeCSS` or `css` instead.");this.cssText=e,this.t=i}get styleSheet(){let e=this.o;const i=this.t;if(ke&&e===void 0){const s=i!==void 0&&i.length===1;s&&(e=Ee.get(i)),e===void 0&&((this.o=e=new CSSStyleSheet).replaceSync(this.cssText),s&&Ee.set(i,e))}return e}toString(){return this.cssText}};const et=t=>new Ve(typeof t=="string"?t:t+"",void 0,Se),x=(t,...e)=>{const i=t.length===1?t[0]:e.reduce((s,r,n)=>s+(a=>{if(a._$cssResult$===!0)return a.cssText;if(typeof a=="number")return a;throw Error("Value passed to 'css' function must be a 'css' function result: "+a+". Use 'unsafeCSS' to pass non-literal values, but take care to ensure page security.")})(r)+t[n+1],t[0]);return new Ve(i,t,Se)},tt=(t,e)=>{if(ke)t.adoptedStyleSheets=e.map(i=>i instanceof CSSStyleSheet?i:i.styleSheet);else for(const i of e){const s=document.createElement("style"),r=Y.litNonce;r!==void 0&&s.setAttribute("nonce",r),s.textContent=i.cssText,t.appendChild(s)}},Ae=ke?t=>t:t=>t instanceof CSSStyleSheet?(e=>{let i="";for(const s of e.cssRules)i+=s.cssText;return et(i)})(t):t;/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */const{is:it,defineProperty:st,getOwnPropertyDescriptor:rt,getOwnPropertyNames:nt,getOwnPropertySymbols:at,getPrototypeOf:ot}=Object,C=globalThis,Re=C.trustedTypes,lt=Re?Re.emptyScript:"",ct=C.reactiveElementPolyfillSupport,N=(t,e)=>t,X={toAttribute(t,e){switch(e){case Boolean:t=t?lt:null;break;case Object:case Array:t=t==null?t:JSON.stringify(t)}return t},fromAttribute(t,e){let i=t;switch(e){case Boolean:i=t!==null;break;case Number:i=t===null?null:Number(t);break;case Object:case Array:try{i=JSON.parse(t)}catch{i=null}}return i}},xe=(t,e)=>!it(t,e),Oe={attribute:!0,type:String,converter:X,reflect:!1,useDefault:!1,hasChanged:xe};Symbol.metadata??(Symbol.metadata=Symbol("metadata")),C.litPropertyMetadata??(C.litPropertyMetadata=new WeakMap);let L=class extends HTMLElement{static addInitializer(e){this._$Ei(),(this.l??(this.l=[])).push(e)}static get observedAttributes(){return this.finalize(),this._$Eh&&[...this._$Eh.keys()]}static createProperty(e,i=Oe){if(i.state&&(i.attribute=!1),this._$Ei(),this.prototype.hasOwnProperty(e)&&((i=Object.create(i)).wrapped=!0),this.elementProperties.set(e,i),!i.noAccessor){const s=Symbol(),r=this.getPropertyDescriptor(e,s,i);r!==void 0&&st(this.prototype,e,r)}}static getPropertyDescriptor(e,i,s){const{get:r,set:n}=rt(this.prototype,e)??{get(){return this[i]},set(a){this[i]=a}};return{get:r,set(a){const c=r?.call(this);n?.call(this,a),this.requestUpdate(e,c,s)},configurable:!0,enumerable:!0}}static getPropertyOptions(e){return this.elementProperties.get(e)??Oe}static _$Ei(){if(this.hasOwnProperty(N("elementProperties")))return;const e=ot(this);e.finalize(),e.l!==void 0&&(this.l=[...e.l]),this.elementProperties=new Map(e.elementProperties)}static finalize(){if(this.hasOwnProperty(N("finalized")))return;if(this.finalized=!0,this._$Ei(),this.hasOwnProperty(N("properties"))){const i=this.properties,s=[...nt(i),...at(i)];for(const r of s)this.createProperty(r,i[r])}const e=this[Symbol.metadata];if(e!==null){const i=litPropertyMetadata.get(e);if(i!==void 0)for(const[s,r]of i)this.elementProperties.set(s,r)}this._$Eh=new Map;for(const[i,s]of this.elementProperties){const r=this._$Eu(i,s);r!==void 0&&this._$Eh.set(r,i)}this.elementStyles=this.finalizeStyles(this.styles)}static finalizeStyles(e){const i=[];if(Array.isArray(e)){const s=new Set(e.flat(1/0).reverse());for(const r of s)i.unshift(Ae(r))}else e!==void 0&&i.push(Ae(e));return i}static _$Eu(e,i){const s=i.attribute;return s===!1?void 0:typeof s=="string"?s:typeof e=="string"?e.toLowerCase():void 0}constructor(){super(),this._$Ep=void 0,this.isUpdatePending=!1,this.hasUpdated=!1,this._$Em=null,this._$Ev()}_$Ev(){this._$ES=new Promise(e=>this.enableUpdating=e),this._$AL=new Map,this._$E_(),this.requestUpdate(),this.constructor.l?.forEach(e=>e(this))}addController(e){(this._$EO??(this._$EO=new Set)).add(e),this.renderRoot!==void 0&&this.isConnected&&e.hostConnected?.()}removeController(e){this._$EO?.delete(e)}_$E_(){const e=new Map,i=this.constructor.elementProperties;for(const s of i.keys())this.hasOwnProperty(s)&&(e.set(s,this[s]),delete this[s]);e.size>0&&(this._$Ep=e)}createRenderRoot(){const e=this.shadowRoot??this.attachShadow(this.constructor.shadowRootOptions);return tt(e,this.constructor.elementStyles),e}connectedCallback(){this.renderRoot??(this.renderRoot=this.createRenderRoot()),this.enableUpdating(!0),this._$EO?.forEach(e=>e.hostConnected?.())}enableUpdating(e){}disconnectedCallback(){this._$EO?.forEach(e=>e.hostDisconnected?.())}attributeChangedCallback(e,i,s){this._$AK(e,s)}_$ET(e,i){const s=this.constructor.elementProperties.get(e),r=this.constructor._$Eu(e,s);if(r!==void 0&&s.reflect===!0){const n=(s.converter?.toAttribute!==void 0?s.converter:X).toAttribute(i,s.type);this._$Em=e,n==null?this.removeAttribute(r):this.setAttribute(r,n),this._$Em=null}}_$AK(e,i){const s=this.constructor,r=s._$Eh.get(e);if(r!==void 0&&this._$Em!==r){const n=s.getPropertyOptions(r),a=typeof n.converter=="function"?{fromAttribute:n.converter}:n.converter?.fromAttribute!==void 0?n.converter:X;this._$Em=r;const c=a.fromAttribute(i,n.type);this[r]=c??this._$Ej?.get(r)??c,this._$Em=null}}requestUpdate(e,i,s,r=!1,n){if(e!==void 0){const a=this.constructor;if(r===!1&&(n=this[e]),s??(s=a.getPropertyOptions(e)),!((s.hasChanged??xe)(n,i)||s.useDefault&&s.reflect&&n===this._$Ej?.get(e)&&!this.hasAttribute(a._$Eu(e,s))))return;this.C(e,i,s)}this.isUpdatePending===!1&&(this._$ES=this._$EP())}C(e,i,{useDefault:s,reflect:r,wrapped:n},a){s&&!(this._$Ej??(this._$Ej=new Map)).has(e)&&(this._$Ej.set(e,a??i??this[e]),n!==!0||a!==void 0)||(this._$AL.has(e)||(this.hasUpdated||s||(i=void 0),this._$AL.set(e,i)),r===!0&&this._$Em!==e&&(this._$Eq??(this._$Eq=new Set)).add(e))}async _$EP(){this.isUpdatePending=!0;try{await this._$ES}catch(i){Promise.reject(i)}const e=this.scheduleUpdate();return e!=null&&await e,!this.isUpdatePending}scheduleUpdate(){return this.performUpdate()}performUpdate(){if(!this.isUpdatePending)return;if(!this.hasUpdated){if(this.renderRoot??(this.renderRoot=this.createRenderRoot()),this._$Ep){for(const[r,n]of this._$Ep)this[r]=n;this._$Ep=void 0}const s=this.constructor.elementProperties;if(s.size>0)for(const[r,n]of s){const{wrapped:a}=n,c=this[r];a!==!0||this._$AL.has(r)||c===void 0||this.C(r,void 0,n,c)}}let e=!1;const i=this._$AL;try{e=this.shouldUpdate(i),e?(this.willUpdate(i),this._$EO?.forEach(s=>s.hostUpdate?.()),this.update(i)):this._$EM()}catch(s){throw e=!1,this._$EM(),s}e&&this._$AE(i)}willUpdate(e){}_$AE(e){this._$EO?.forEach(i=>i.hostUpdated?.()),this.hasUpdated||(this.hasUpdated=!0,this.firstUpdated(e)),this.updated(e)}_$EM(){this._$AL=new Map,this.isUpdatePending=!1}get updateComplete(){return this.getUpdateComplete()}getUpdateComplete(){return this._$ES}shouldUpdate(e){return!0}update(e){this._$Eq&&(this._$Eq=this._$Eq.forEach(i=>this._$ET(i,this[i]))),this._$EM()}updated(e){}firstUpdated(e){}};L.elementStyles=[],L.shadowRootOptions={mode:"open"},L[N("elementProperties")]=new Map,L[N("finalized")]=new Map,ct?.({ReactiveElement:L}),(C.reactiveElementVersions??(C.reactiveElementVersions=[])).push("2.1.2");/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */const U=globalThis,Pe=t=>t,ee=U.trustedTypes,Ie=ee?ee.createPolicy("lit-html",{createHTML:t=>t}):void 0,Ge="$lit$",_=`lit$${Math.random().toFixed(9).slice(2)}$`,qe="?"+_,dt=`<${qe}>`,P=document,H=()=>P.createComment(""),V=t=>t===null||typeof t!="object"&&typeof t!="function",_e=Array.isArray,pt=t=>_e(t)||typeof t?.[Symbol.iterator]=="function",oe=`[ 	
\f\r]`,D=/<(?:(!--|\/[^a-zA-Z])|(\/?[a-zA-Z][^>\s]*)|(\/?$))/g,Te=/-->/g,Le=/>/g,A=RegExp(`>|${oe}(?:([^\\s"'>=/]+)(${oe}*=${oe}*(?:[^ 	
\f\r"'\`<>=]|("|')|))|$)`,"g"),Me=/'/g,je=/"/g,Fe=/^(?:script|style|textarea|title)$/i,ut=t=>(e,...i)=>({_$litType$:t,strings:e,values:i}),o=ut(1),M=Symbol.for("lit-noChange"),f=Symbol.for("lit-nothing"),ze=new WeakMap,R=P.createTreeWalker(P,129);function We(t,e){if(!_e(t)||!t.hasOwnProperty("raw"))throw Error("invalid template strings array");return Ie!==void 0?Ie.createHTML(e):e}const ht=(t,e)=>{const i=t.length-1,s=[];let r,n=e===2?"<svg>":e===3?"<math>":"",a=D;for(let c=0;c<i;c++){const l=t[c];let u,h,d=-1,w=0;for(;w<l.length&&(a.lastIndex=w,h=a.exec(l),h!==null);)w=a.lastIndex,a===D?h[1]==="!--"?a=Te:h[1]!==void 0?a=Le:h[2]!==void 0?(Fe.test(h[2])&&(r=RegExp("</"+h[2],"g")),a=A):h[3]!==void 0&&(a=A):a===A?h[0]===">"?(a=r??D,d=-1):h[1]===void 0?d=-2:(d=a.lastIndex-h[2].length,u=h[1],a=h[3]===void 0?A:h[3]==='"'?je:Me):a===je||a===Me?a=A:a===Te||a===Le?a=D:(a=A,r=void 0);const k=a===A&&t[c+1].startsWith("/>")?" ":"";n+=a===D?l+dt:d>=0?(s.push(u),l.slice(0,d)+Ge+l.slice(d)+_+k):l+_+(d===-2?c:k)}return[We(t,n+(t[i]||"<?>")+(e===2?"</svg>":e===3?"</math>":"")),s]};class G{constructor({strings:e,_$litType$:i},s){let r;this.parts=[];let n=0,a=0;const c=e.length-1,l=this.parts,[u,h]=ht(e,i);if(this.el=G.createElement(u,s),R.currentNode=this.el.content,i===2||i===3){const d=this.el.content.firstChild;d.replaceWith(...d.childNodes)}for(;(r=R.nextNode())!==null&&l.length<c;){if(r.nodeType===1){if(r.hasAttributes())for(const d of r.getAttributeNames())if(d.endsWith(Ge)){const w=h[a++],k=r.getAttribute(d).split(_),J=/([.?@])?(.*)/.exec(w);l.push({type:1,index:n,name:J[2],strings:k,ctor:J[1]==="."?mt:J[1]==="?"?ft:J[1]==="@"?bt:ne}),r.removeAttribute(d)}else d.startsWith(_)&&(l.push({type:6,index:n}),r.removeAttribute(d));if(Fe.test(r.tagName)){const d=r.textContent.split(_),w=d.length-1;if(w>0){r.textContent=ee?ee.emptyScript:"";for(let k=0;k<w;k++)r.append(d[k],H()),R.nextNode(),l.push({type:2,index:++n});r.append(d[w],H())}}}else if(r.nodeType===8)if(r.data===qe)l.push({type:2,index:n});else{let d=-1;for(;(d=r.data.indexOf(_,d+1))!==-1;)l.push({type:7,index:n}),d+=_.length-1}n++}}static createElement(e,i){const s=P.createElement("template");return s.innerHTML=e,s}}function j(t,e,i=t,s){if(e===M)return e;let r=s!==void 0?i._$Co?.[s]:i._$Cl;const n=V(e)?void 0:e._$litDirective$;return r?.constructor!==n&&(r?._$AO?.(!1),n===void 0?r=void 0:(r=new n(t),r._$AT(t,i,s)),s!==void 0?(i._$Co??(i._$Co=[]))[s]=r:i._$Cl=r),r!==void 0&&(e=j(t,r._$AS(t,e.values),r,s)),e}class gt{constructor(e,i){this._$AV=[],this._$AN=void 0,this._$AD=e,this._$AM=i}get parentNode(){return this._$AM.parentNode}get _$AU(){return this._$AM._$AU}u(e){const{el:{content:i},parts:s}=this._$AD,r=(e?.creationScope??P).importNode(i,!0);R.currentNode=r;let n=R.nextNode(),a=0,c=0,l=s[0];for(;l!==void 0;){if(a===l.index){let u;l.type===2?u=new F(n,n.nextSibling,this,e):l.type===1?u=new l.ctor(n,l.name,l.strings,this,e):l.type===6&&(u=new yt(n,this,e)),this._$AV.push(u),l=s[++c]}a!==l?.index&&(n=R.nextNode(),a++)}return R.currentNode=P,r}p(e){let i=0;for(const s of this._$AV)s!==void 0&&(s.strings!==void 0?(s._$AI(e,s,i),i+=s.strings.length-2):s._$AI(e[i])),i++}}class F{get _$AU(){return this._$AM?._$AU??this._$Cv}constructor(e,i,s,r){this.type=2,this._$AH=f,this._$AN=void 0,this._$AA=e,this._$AB=i,this._$AM=s,this.options=r,this._$Cv=r?.isConnected??!0}get parentNode(){let e=this._$AA.parentNode;const i=this._$AM;return i!==void 0&&e?.nodeType===11&&(e=i.parentNode),e}get startNode(){return this._$AA}get endNode(){return this._$AB}_$AI(e,i=this){e=j(this,e,i),V(e)?e===f||e==null||e===""?(this._$AH!==f&&this._$AR(),this._$AH=f):e!==this._$AH&&e!==M&&this._(e):e._$litType$!==void 0?this.$(e):e.nodeType!==void 0?this.T(e):pt(e)?this.k(e):this._(e)}O(e){return this._$AA.parentNode.insertBefore(e,this._$AB)}T(e){this._$AH!==e&&(this._$AR(),this._$AH=this.O(e))}_(e){this._$AH!==f&&V(this._$AH)?this._$AA.nextSibling.data=e:this.T(P.createTextNode(e)),this._$AH=e}$(e){const{values:i,_$litType$:s}=e,r=typeof s=="number"?this._$AC(e):(s.el===void 0&&(s.el=G.createElement(We(s.h,s.h[0]),this.options)),s);if(this._$AH?._$AD===r)this._$AH.p(i);else{const n=new gt(r,this),a=n.u(this.options);n.p(i),this.T(a),this._$AH=n}}_$AC(e){let i=ze.get(e.strings);return i===void 0&&ze.set(e.strings,i=new G(e)),i}k(e){_e(this._$AH)||(this._$AH=[],this._$AR());const i=this._$AH;let s,r=0;for(const n of e)r===i.length?i.push(s=new F(this.O(H()),this.O(H()),this,this.options)):s=i[r],s._$AI(n),r++;r<i.length&&(this._$AR(s&&s._$AB.nextSibling,r),i.length=r)}_$AR(e=this._$AA.nextSibling,i){for(this._$AP?.(!1,!0,i);e!==this._$AB;){const s=Pe(e).nextSibling;Pe(e).remove(),e=s}}setConnected(e){this._$AM===void 0&&(this._$Cv=e,this._$AP?.(e))}}class ne{get tagName(){return this.element.tagName}get _$AU(){return this._$AM._$AU}constructor(e,i,s,r,n){this.type=1,this._$AH=f,this._$AN=void 0,this.element=e,this.name=i,this._$AM=r,this.options=n,s.length>2||s[0]!==""||s[1]!==""?(this._$AH=Array(s.length-1).fill(new String),this.strings=s):this._$AH=f}_$AI(e,i=this,s,r){const n=this.strings;let a=!1;if(n===void 0)e=j(this,e,i,0),a=!V(e)||e!==this._$AH&&e!==M,a&&(this._$AH=e);else{const c=e;let l,u;for(e=n[0],l=0;l<n.length-1;l++)u=j(this,c[s+l],i,l),u===M&&(u=this._$AH[l]),a||(a=!V(u)||u!==this._$AH[l]),u===f?e=f:e!==f&&(e+=(u??"")+n[l+1]),this._$AH[l]=u}a&&!r&&this.j(e)}j(e){e===f?this.element.removeAttribute(this.name):this.element.setAttribute(this.name,e??"")}}class mt extends ne{constructor(){super(...arguments),this.type=3}j(e){this.element[this.name]=e===f?void 0:e}}class ft extends ne{constructor(){super(...arguments),this.type=4}j(e){this.element.toggleAttribute(this.name,!!e&&e!==f)}}class bt extends ne{constructor(e,i,s,r,n){super(e,i,s,r,n),this.type=5}_$AI(e,i=this){if((e=j(this,e,i,0)??f)===M)return;const s=this._$AH,r=e===f&&s!==f||e.capture!==s.capture||e.once!==s.once||e.passive!==s.passive,n=e!==f&&(s===f||r);r&&this.element.removeEventListener(this.name,this,s),n&&this.element.addEventListener(this.name,this,e),this._$AH=e}handleEvent(e){typeof this._$AH=="function"?this._$AH.call(this.options?.host??this.element,e):this._$AH.handleEvent(e)}}class yt{constructor(e,i,s){this.element=e,this.type=6,this._$AN=void 0,this._$AM=i,this.options=s}get _$AU(){return this._$AM._$AU}_$AI(e){j(this,e)}}const vt=U.litHtmlPolyfillSupport;vt?.(G,F),(U.litHtmlVersions??(U.litHtmlVersions=[])).push("3.3.2");const $t=(t,e,i)=>{const s=i?.renderBefore??e;let r=s._$litPart$;if(r===void 0){const n=i?.renderBefore??null;s._$litPart$=r=new F(e.insertBefore(H(),n),n,void 0,i??{})}return r._$AI(t),r};/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */const B=globalThis;class g extends L{constructor(){super(...arguments),this.renderOptions={host:this},this._$Do=void 0}createRenderRoot(){var i;const e=super.createRenderRoot();return(i=this.renderOptions).renderBefore??(i.renderBefore=e.firstChild),e}update(e){const i=this.render();this.hasUpdated||(this.renderOptions.isConnected=this.isConnected),super.update(e),this._$Do=$t(i,this.renderRoot,this.renderOptions)}connectedCallback(){super.connectedCallback(),this._$Do?.setConnected(!0)}disconnectedCallback(){super.disconnectedCallback(),this._$Do?.setConnected(!1)}render(){return M}}g._$litElement$=!0,g.finalized=!0,B.litElementHydrateSupport?.({LitElement:g});const wt=B.litElementPolyfillSupport;wt?.({LitElement:g});(B.litElementVersions??(B.litElementVersions=[])).push("4.2.2");/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */const y=t=>(e,i)=>{i!==void 0?i.addInitializer(()=>{customElements.define(t,e)}):customElements.define(t,e)};/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */const kt={attribute:!0,type:String,converter:X,reflect:!1,hasChanged:xe},St=(t=kt,e,i)=>{const{kind:s,metadata:r}=i;let n=globalThis.litPropertyMetadata.get(r);if(n===void 0&&globalThis.litPropertyMetadata.set(r,n=new Map),s==="setter"&&((t=Object.create(t)).wrapped=!0),n.set(i.name,t),s==="accessor"){const{name:a}=i;return{set(c){const l=e.get.call(this);e.set.call(this,c),this.requestUpdate(a,l,t,!0,c)},init(c){return c!==void 0&&this.C(a,void 0,t,c),c}}}if(s==="setter"){const{name:a}=i;return function(c){const l=this[a];e.call(this,c),this.requestUpdate(a,l,t,!0,c)}}throw Error("Unsupported decorator location: "+s)};function W(t){return(e,i)=>typeof i=="object"?St(t,e,i):((s,r,n)=>{const a=r.hasOwnProperty(n);return r.constructor.createProperty(n,s),a?Object.getOwnPropertyDescriptor(r,n):void 0})(t,e,i)}/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */function m(t){return W({...t,state:!0,attribute:!1})}class xt{constructor(){this.ws=null,this.pending=new Map,this.closed=!1,this.lastSeq=null,this.backoffMs=800,this.connectSent=!1}setOnHello(e){this.onHello=e}setOnEvent(e){this.onEvent=e}setOnClose(e){this.onClose=e}setOnConnect(e){this.onConnect=e}start(){this.closed=!1,this.connect()}stop(){this.closed=!0,this.ws?.close(),this.ws=null}get connected(){return this.ws?.readyState===WebSocket.OPEN}connect(){if(!this.closed)try{this.connectSent=!1;const e=Ze.value;console.log("[Gateway] Connecting to",e),this.ws=new WebSocket(e),this.ws.addEventListener("open",()=>{console.log("[Gateway] Connected to",e),this.backoffMs=800,this.sendConnect(),this.onConnect?.()}),this.ws.addEventListener("message",i=>this.handleMessage(String(i.data??""))),this.ws.addEventListener("close",i=>{const s=String(i.reason??"");console.log("[Gateway] Closed:",i.code,s),this.ws=null,this.flushPending(new Error(`gateway closed (${i.code}): ${s}`)),this.onClose?.({code:i.code,reason:s}),this.scheduleReconnect()}),this.ws.addEventListener("error",()=>{})}catch(e){console.error("[Gateway] Connection error:",e),this.scheduleReconnect()}}sendConnect(){if(this.connectSent)return;this.connectSent=!0;const e={type:"connect",protocol:1,role:"operator",scopes:["operator.admin","operator.approvals","operator.pairing"],clientId:"secuclaw-control-ui",clientMode:"webchat"};this.ws?.send(JSON.stringify(e))}scheduleReconnect(){if(this.closed)return;const e=this.backoffMs;this.backoffMs=Math.min(this.backoffMs*1.7,15e3),setTimeout(()=>this.connect(),e)}flushPending(e){for(const[,i]of this.pending)i.reject(e);this.pending.clear()}handleMessage(e){let i;try{i=JSON.parse(e)}catch{return}const s=i;if(s.type==="hello-ok"){this.onHello?.(i);return}if(s.type==="event"){const r=i,n=typeof r.seq=="number"?r.seq:null;n!==null&&(this.lastSeq!==null&&n>this.lastSeq+1&&console.warn("[Gateway] Gap detected:",this.lastSeq+1,"->",n),this.lastSeq=n),this.onEvent?.(r);return}if(s.type==="res"){const r=i,n=this.pending.get(r.id);if(!n)return;this.pending.delete(r.id),r.ok?n.resolve(r.payload):n.reject(new Error(r.error?.message??"request failed"))}}request(e,i){if(!this.ws||this.ws.readyState!==WebSocket.OPEN)return Promise.reject(new Error("gateway not connected"));const s=crypto.randomUUID(),r={type:"req",id:s,method:e,params:i},n=new Promise((a,c)=>{this.pending.set(s,{resolve:l=>a(l),reject:c})});return this.ws.send(JSON.stringify(r)),n}}const de=new xt,pe=new Set;let O="disconnected",De=localStorage.getItem("secuclaw_ws_url")||"ws://127.0.0.1:21981/ws";const le={get value(){return O},subscribe(t){return pe.add(t),t(O),()=>pe.delete(t)}},Ze={get value(){return De},set value(t){De=t,localStorage.setItem("secuclaw_ws_url",t)}};function Q(){pe.forEach(t=>t(O))}function _t(){O="disconnected",Q(),de.setOnConnect(()=>{O="connected",Q()}),de.setOnClose(()=>{O="disconnected",Q()})}function Ke(){O="connecting",Q(),de.start()}const Ct={app:{title:"SecuClaw",subtitle:"AI-Powered Security Operations Platform",loading:"Loading...",error:"Failed to load",retry:"Retry",refresh:"Refresh",export:"Export",search:"Search",searchPlaceholder:"Search...",filter:"Filter",all:"All",actions:"Actions",status:"Status",name:"Name",type:"Type",description:"Description",category:"Category",count:"Count",date:"Date",time:"Time",owner:"Owner",priority:"Priority",critical:"Critical",high:"High",medium:"Medium",low:"Low",info:"Info"},nav:{dashboard:"Dashboard",threatIntel:"Threat Intel",compliance:"Compliance",knowledge:"Knowledge Base",console:"Console",settings:"Settings",skills:"Skills Market",chat:"AI Security Expert",systemCapabilities:"System Capabilities",core:"Core",builtin:"Built-in",extensions:"Extensions",securityIncidents:"Security Incidents",vulnManagement:"Vulnerability Management",analysisReports:"Analysis Reports",securityRisk:"Security Risk",warroom:"War Room",messaging:"Messaging"},common:{yes:"Yes",no:"No",ok:"OK",cancel:"Cancel",save:"Save",delete:"Delete",edit:"Edit",view:"View",close:"Close",confirm:"Confirm",warning:"Warning",error:"Error",success:"Success",connected:"Connected",disconnected:"Disconnected",send:"Send",sending:"Sending...",thinking:"Thinking..."},connection:{connected:"Connected",connecting:"Connecting",disconnected:"Disconnected",connect:"Connect",disconnect:"Disconnect",reconnect:"Reconnect"},roles:{selectRole:"Select Role",securityExpert:"Security Expert",securityExpertDesc:"SEC - Threat Detection / Vulnerability Assessment / Penetration Testing",privacyOfficer:"Privacy Officer",privacyOfficerDesc:"SEC+LEG - Privacy Protection / Data Compliance",securityArchitect:"Security Architect",securityArchitectDesc:"SEC+IT - Infrastructure Security / Code Security",businessSecurityOfficer:"Business Security Officer",businessSecurityOfficerDesc:"SEC+BIZ - Supply Chain Security / Business Continuity",ciso:"Chief Security Architect",cisoDesc:"SEC+LEG+IT - Enterprise Security Architecture",supplyChainOfficer:"Supply Chain Security Officer",supplyChainOfficerDesc:"SEC+LEG+BIZ - Supply Chain Risk",securityOpsOfficer:"Security Operations Officer",securityOpsOfficerDesc:"SEC+IT+BIZ - Business Operations Security",commander:"Security Commander",commanderDesc:"SEC+LEG+IT+BIZ - Full-Domain Security Command"},dashboard:{title:"Security Dashboard",securityEvents:"Security Events",highVulns:"High-Risk Vulnerabilities",complianceScore:"Compliance Score",threatIntel:"Threat Intelligence",latestAlerts:"Latest Alerts",suspiciousLateralMovement:"Suspicious lateral movement detected",cveExposure:"CVE-2024-1234 high-risk vulnerability exposed",newThreatIOC:"New 5 threat intelligence IOCs added",vsLastWeek:"vs last week",vsLastMonth:"vs last month",newItems:"new items"},chat:{title:"AI Security Expert",placeholder:"Describe your security issue or need...",welcomeTitle:"Hello! I am {role} - {desc}.",welcomeBody:`I can help you with:
• Analyzing security vulnerabilities and risks
• Developing security strategies and solutions
• Responding to security incidents
• Providing compliance advice

Please describe your security problem or need.`,analyzing:"Based on your question, I analyzed the current vulnerability situation:",criticalVuln:"Critical vulnerability: CVE-2024-1234 (Remote Code Execution)",mediumVuln:"Medium vulnerability: CVE-2024-5678 (SQL Injection)",recommendation:"It is recommended to fix critical vulnerabilities immediately and implement a vulnerability management process.",currentStatus:"Current security posture:",activeEvents:"Active events: {count} (urgent {urgent})",pendingAlerts:"Pending alerts: {count}",closedEvents:"Closed events: {count}",suggestion:"It is recommended to prioritize urgent security incidents.",defaultResponse:`Thank you for your consultation. My suggestions for the issue you described are:

1. Collect more detailed information
2. Conduct risk assessment
3. Develop a response plan

You can provide more specific information for more precise advice.`},knowledge:{title:"Knowledge Base",mitreTechniques:"MITRE ATT&CK Techniques",scfControls:"SCF Controls",threatActors:"Threat Actors",cveDatabase:"CVE Database",recentActivity:"Recent Activity",coverage:"Coverage"},settings:{title:"System Settings",general:"General",language:"Language",selectLanguage:"Select Language",llmConfig:"LLM Service Configuration",addProvider:"Add Provider",editProvider:"Edit Provider",deleteProvider:"Delete Provider",providerName:"Provider Name",apiKey:"API Key",apiEndpoint:"API Endpoint",model:"Model",save:"Save",cancel:"Cancel",delete:"Delete",confirmDelete:"Are you sure you want to delete this provider?"}},Et="modulepreload",At=function(t){return"/"+t},Ne={},Rt=function(e,i,s){let r=Promise.resolve();if(i&&i.length>0){document.getElementsByTagName("link");const a=document.querySelector("meta[property=csp-nonce]"),c=a?.nonce||a?.getAttribute("nonce");r=Promise.allSettled(i.map(l=>{if(l=At(l),l in Ne)return;Ne[l]=!0;const u=l.endsWith(".css"),h=u?'[rel="stylesheet"]':"";if(document.querySelector(`link[href="${l}"]${h}`))return;const d=document.createElement("link");if(d.rel=u?"stylesheet":Et,u||(d.as="script"),d.crossOrigin="",d.href=l,c&&d.setAttribute("nonce",c),document.head.appendChild(d),u)return new Promise((w,k)=>{d.addEventListener("load",w),d.addEventListener("error",()=>k(new Error(`Unable to preload CSS for ${l}`)))})}))}function n(a){const c=new Event("vite:preloadError",{cancelable:!0});if(c.payload=a,window.dispatchEvent(c),!c.defaultPrevented)throw a}return r.then(a=>{for(const c of a||[])c.status==="rejected"&&n(c.reason);return e().catch(n)})},S="en-US",Je=["zh-CN"],Ot={"zh-CN":{exportName:"zh_CN",loader:()=>Rt(()=>import("./zh-CN-C-OvxFfm.js"),[])}},Pt=[S,...Je];function It(t){return t!=null&&Pt.includes(t)}function Tt(t){return Je.includes(t)}function Lt(t){return t.startsWith("zh")?"zh-CN":S}async function Mt(t){if(!Tt(t))return null;const e=Ot[t];return(await e.loader())[e.exportName]??null}class jt{constructor(){this.locale=S,this.translations={[S]:Ct},this.subscribers=new Set,this.loadLocale()}resolveInitialLocale(){const e=localStorage.getItem("secuclaw.i18n.locale");return It(e)?e:Lt(navigator.language)}loadLocale(){const e=this.resolveInitialLocale();if(e===S){this.locale=S;return}this.setLocale(e)}getLocale(){return this.locale}async setLocale(e){const i=e!==S&&!this.translations[e];if(!(this.locale===e&&!i)){if(i)try{const s=await Mt(e);if(!s)return;this.translations[e]=s}catch(s){console.error(`Failed to load locale: ${e}`,s);return}this.locale=e,localStorage.setItem("secuclaw.i18n.locale",e),this.notify()}}registerTranslation(e,i){this.translations[e]=i}subscribe(e){return this.subscribers.add(e),()=>this.subscribers.delete(e)}notify(){this.subscribers.forEach(e=>e(this.locale))}t(e,i){const s=e.split(".");let r=this.translations[this.locale]||this.translations[S];for(const n of s)if(r&&typeof r=="object")r=r[n];else{r=void 0;break}if(r===void 0&&this.locale!==S){r=this.translations[S];for(const n of s)if(r&&typeof r=="object")r=r[n];else{r=void 0;break}}return typeof r!="string"?e:i?r.replace(/\{(\w+)\}/g,(n,a)=>i[a]||`{${a}}`):r}}const Z=new jt,p=(t,e)=>Z.t(t,e),Ye=t=>Z.setLocale(t);class I{constructor(e){this.host=e,this.host.addController(this)}hostConnected(){this.unsubscribe=Z.subscribe(()=>{this.host.requestUpdate()})}hostDisconnected(){this.unsubscribe?.()}}var zt=Object.defineProperty,Dt=Object.getOwnPropertyDescriptor,$=(t,e,i,s)=>{for(var r=s>1?void 0:s?Dt(e,i):e,n=t.length-1,a;n>=0;n--)(a=t[n])&&(r=(s?a(e,i,r):a(r))||r);return s&&r&&zt(e,i,r),r};let te=class extends g{constructor(){super(...arguments),this.roleId="security-expert",this.i18n=new I(this)}render(){return o`<h1>${p("dashboard.title")}</h1>`}};te.styles=x`
    :host { display: block; padding: 1.5rem; }
    h1 { font-size: 1.5rem; margin: 0; }
  `;$([W({type:String})],te.prototype,"roleId",2);te=$([y("dashboard-view")],te);let ie=class extends g{constructor(){super(...arguments),this.roleId="security-expert",this.i18n=new I(this)}render(){return o`<div class="chat">${p("chat.title")}</div>`}};ie.styles=x`
    :host { display: flex; flex-direction: column; height: 100%; }
  `;$([W({type:String})],ie.prototype,"roleId",2);ie=$([y("chat-view")],ie);let ue=class extends g{constructor(){super(...arguments),this.i18n=new I(this)}render(){return o`<h1>${p("knowledge.title")}</h1>`}};ue.styles=x`
    :host { display: block; padding: 1.5rem; }
  `;ue=$([y("knowledge-view")],ue);const E=x`
  :host { display: block; padding: 1.5rem; }
  div { color: #a0a0b0; font-size: 1rem; }
`;let he=class extends g{render(){return o`<div>${p("nav.threatIntel")}</div>`}};he.styles=E;he=$([y("threat-intel-view")],he);let ge=class extends g{render(){return o`<div>${p("nav.securityIncidents")}</div>`}};ge.styles=E;ge=$([y("security-incidents-view")],ge);let me=class extends g{render(){return o`<div>${p("nav.vulnManagement")}</div>`}};me.styles=E;me=$([y("vulnerability-management-view")],me);let fe=class extends g{render(){return o`<div>${p("nav.analysisReports")}</div>`}};fe.styles=E;fe=$([y("analysis-reports-view")],fe);let be=class extends g{render(){return o`<div>${p("nav.compliance")}</div>`}};be.styles=E;be=$([y("compliance-audit-view")],be);let ye=class extends g{render(){return o`<div>${p("nav.securityRisk")}</div>`}};ye.styles=E;ye=$([y("security-risk-view")],ye);let ve=class extends g{render(){return o`<div>${p("nav.warroom")}</div>`}};ve.styles=E;ve=$([y("warroom-view")],ve);let $e=class extends g{render(){return o`<div>${p("nav.messaging")}</div>`}};$e.styles=E;$e=$([y("messaging-view")],$e);var Kt=Object.defineProperty,Nt=Object.getOwnPropertyDescriptor,Ce=(t,e,i,s)=>{for(var r=s>1?void 0:s?Nt(e,i):e,n=t.length-1,a;n>=0;n--)(a=t[n])&&(r=(s?a(e,i,r):a(r))||r);return s&&r&&Kt(e,i,r),r};const Ue=[{id:"dashboard",label:"仪表盘",icon:"📊",color:"#3b82f6",description:"安全态势总览仪表盘",category:"builtin"},{id:"knowledge",label:"知识库",icon:"🧠",color:"#6366f1",description:"MITRE ATT&CK 和 SCF 知识库",category:"builtin"},{id:"threat-intel",label:"威胁情报",icon:"🔍",color:"#ef4444",description:"威胁情报收集与分析",category:"extension"},{id:"security-incidents",label:"安全事件",icon:"🚨",color:"#ef4444",description:"安全事件管理与响应",category:"extension"},{id:"vulnerability-management",label:"漏洞管理",icon:"🔴",color:"#f97316",description:"漏洞扫描与修复跟踪",category:"extension"},{id:"analysis-reports",label:"分析报告",icon:"📈",color:"#3b82f6",description:"安全分析与报告生成",category:"extension"},{id:"compliance-audit",label:"合规审计",icon:"📝",color:"#06b6d4",description:"合规性审计与管理",category:"extension"},{id:"security-risk",label:"安全风险",icon:"⚡",color:"#f59e0b",description:"企业风险评估与管理",category:"extension"},{id:"warroom",label:"作战室",icon:"🎯",color:"#f97316",description:"安全事件指挥作战室",category:"extension"},{id:"messaging",label:"消息收发",icon:"💬",color:"#8b5cf6"}],Be={"security-expert":{id:"security-expert",nameKey:"roles.securityExpert",emoji:"🛡️",descriptionKey:"roles.securityExpertDesc"},"privacy-security-officer":{id:"privacy-officer",nameKey:"roles.privacyOfficer",emoji:"🔒",descriptionKey:"roles.privacyOfficerDesc"},"security-architect":{id:"security-architect",nameKey:"roles.securityArchitect",emoji:"🏗️",descriptionKey:"roles.securityArchitectDesc"},"business-security-officer":{id:"business-security-officer",nameKey:"roles.businessSecurityOfficer",emoji:"💼",descriptionKey:"roles.businessSecurityOfficerDesc"},"chief-security-architect":{id:"ciso",nameKey:"roles.ciso",emoji:"👔",descriptionKey:"roles.cisoDesc"},"supply-chain-security-officer":{id:"supply-chain-security",nameKey:"roles.supplyChainOfficer",emoji:"🔗",descriptionKey:"roles.supplyChainOfficerDesc"},"business-security-operations":{id:"security-ops",nameKey:"roles.securityOpsOfficer",emoji:"⚙️",descriptionKey:"roles.securityOpsOfficerDesc"},"secuclaw-commander":{id:"secuclaw-commander",nameKey:"roles.commander",emoji:"🎖️",descriptionKey:"roles.commanderDesc"}};let q=class extends g{constructor(){super(...arguments),this.roleId="security-expert",this.installedSkills=[],this._installedSkills=[],this.i18n=new I(this)}connectedCallback(){super.connectedCallback(),this._installedSkills=[...this.installedSkills]}updated(t){t.has("installedSkills")&&(this._installedSkills=[...this.installedSkills])}toggleSkill(t){const e=this._installedSkills.includes(t),i=e?this._installedSkills.filter(s=>s!==t):[...this._installedSkills,t];this._installedSkills=i,this.dispatchEvent(new CustomEvent("skill-toggle",{detail:{skillId:t,enabled:!e},bubbles:!0,composed:!0}))}get currentRoleSkill(){return Be[this.roleId]||Be["security-expert"]}render(){const t=Ue.filter(r=>r.category==="builtin"),e=Ue.filter(r=>r.category==="extension"),i=this.currentRoleSkill,s=`/skills/${i.id}/SKILL.md`;return o`
      <h1>📦 技能市场</h1>
      <p class="subtitle">安装和管理安全技能扩展</p>

      <!-- Role Skills Section -->
      <div class="section-title">🎖️ ${p(i.nameKey)} 角色技能</div>
      <div class="skills-grid">
        <div class="skill-card" style="--skill-color: #3b82f6">
          <div class="skill-icon">${i.emoji}</div>
          <div class="skill-info">
            <div class="skill-name">${p(i.nameKey)}</div>
            <div class="skill-desc">${p(i.descriptionKey)}</div>
          </div>
          <div class="skill-toggle">
            <a href="${s}" target="_blank" class="view-skill-btn" title="查看技能详情">
              📖
            </a>
          </div>
        </div>
      </div>

      <div class="section-title">系统内置技能</div>
      <div class="skills-grid">
        ${t.map(r=>this.renderSkillCard(r))}
      </div>

      <div class="section-title">扩展技能</div>
      <div class="skills-grid">
        ${e.map(r=>this.renderSkillCard(r))}
      </div>
    `}renderSkillCard(t){const e=this._installedSkills.includes(t.id);return o`
      <div class="skill-card" style="--skill-color: ${t.color}">
        <div class="skill-icon">${t.icon}</div>
        <div class="skill-info">
          <div class="skill-name">
            ${t.label}
            <span class="${t.category==="builtin"?"builtin-badge":"extension-badge"}">
              ${t.category==="builtin"?"内置":"扩展"}
            </span>
          </div>
          <div class="skill-desc">${t.description}</div>
        </div>
        <div class="skill-toggle">
          <button 
            class="toggle-btn ${e?"active":""}"
            @click=${()=>this.toggleSkill(t.id)}
            ?disabled=${t.category==="builtin"}
            title=${t.category==="builtin"?"内置技能无法卸载":""}
          ></button>
        </div>
      </div>
    `}};q.styles=x`
    :host {
      display: block;
      padding: 2rem;
    }
    h1 {
      font-size: 1.5rem;
      margin-bottom: 0.5rem;
    }
    .subtitle {
      color: #888;
      font-size: 0.9rem;
      margin-bottom: 2rem;
    }
    .section-title {
      font-size: 1.1rem;
      margin-bottom: 1rem;
      color: #a0a0b0;
    }
    .skills-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
      gap: 1rem;
      margin-bottom: 2rem;
    }
    .skill-card {
      background: #1a1a2e;
      border-radius: 12px;
      padding: 1.25rem;
      border: 1px solid #2a2a4a;
      display: flex;
      align-items: flex-start;
      gap: 1rem;
      transition: all 0.2s;
    }
    .skill-card:hover {
      border-color: var(--skill-color, #3b82f6);
    }
    .skill-icon {
      font-size: 2rem;
      flex-shrink: 0;
    }
    .skill-info {
      flex: 1;
      min-width: 0;
    }
    .skill-name {
      font-weight: 600;
      margin-bottom: 0.25rem;
    }
    .skill-desc {
      font-size: 0.8rem;
      color: #888;
    }
    .skill-toggle {
      flex-shrink: 0;
    }
    .toggle-btn {
      width: 48px;
      height: 24px;
      border-radius: 12px;
      border: none;
      cursor: pointer;
      position: relative;
      transition: all 0.2s;
      background: #2a2a4a;
    }
    .toggle-btn.active {
      background: #22c55e;
    }
    .toggle-btn::after {
      content: '';
      position: absolute;
      top: 2px;
      left: 2px;
      width: 20px;
      height: 20px;
      border-radius: 50%;
      background: #fff;
      transition: all 0.2s;
    }
    .toggle-btn.active::after {
      left: 26px;
    }
    .builtin-badge {
      display: inline-block;
      font-size: 0.65rem;
      padding: 0.15rem 0.4rem;
      border-radius: 4px;
      background: #22c55e20;
      color: #22c55e;
      margin-left: 0.5rem;
    }
    .extension-badge {
      display: inline-block;
      font-size: 0.65rem;
      padding: 0.15rem 0.4rem;
      border-radius: 4px;
      background: #a855f720;
      color: #a855f7;
    }
    .view-skill-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 32px;
      height: 32px;
      border-radius: 6px;
      background: #2a2a4a;
      color: #a0a0b0;
      text-decoration: none;
      font-size: 1rem;
      transition: all 0.2s;
    }
    .view-skill-btn:hover {
      background: #3b82f6;
      color: #fff;
    }
  `;Ce([W({type:String})],q.prototype,"roleId",2);Ce([W({type:Array})],q.prototype,"installedSkills",2);q=Ce([y("skills-market-view")],q);var Ut=Object.defineProperty,Bt=Object.getOwnPropertyDescriptor,Qe=(t,e,i,s)=>{for(var r=s>1?void 0:s?Bt(e,i):e,n=t.length-1,a;n>=0;n--)(a=t[n])&&(r=(s?a(e,i,r):a(r))||r);return s&&r&&Ut(e,i,r),r};let se=class extends g{constructor(){super(...arguments),this.i18n=new I(this),this.activeTab="llm",this.currentLang=Z.getLocale()}render(){return o`
      <h1>${p("settings.title")}</h1>
      
      <div class="tabs">
        <button class="tab ${this.activeTab==="general"?"active":""}" @click=${()=>this.activeTab="general"}>
          ${p("settings.general")||"General"}
        </button>
        <button class="tab ${this.activeTab==="llm"?"active":""}" @click=${()=>this.activeTab="llm"}>
          ${p("settings.llmConfig")}
        </button>
      </div>

      ${this.activeTab==="general"?o`
        <div class="section">
          <div class="section-title">${p("settings.language")||"Language"}</div>
          <div class="setting-row">
            <span class="setting-label">${p("settings.selectLanguage")||"Select Language"}</span>
            <div class="language-selector">
              <button 
                class="lang-btn ${this.currentLang==="zh-CN"?"active":""}"
                @click=${()=>this.changeLanguage("zh-CN")}
              >
                �🇳🇨 简体中文
              </button>
              <button 
                class="lang-btn ${this.currentLang==="en-US"?"active":""}"
                @click=${()=>this.changeLanguage("en-US")}
              >
                🇺🇸 English
              </button>
            </div>
          </div>
        </div>
      `:""}

      ${this.activeTab==="llm"?o`
        <div class="section">
          <div class="section-title">${p("settings.llmConfig")}</div>
          <div class="form-group">
            <label class="form-label">${p("settings.providerName")||"Provider Name"}</label>
            <input type="text" class="form-input" placeholder="OpenAI">
          </div>
          <div class="form-group">
            <label class="form-label">${p("settings.apiEndpoint")}</label>
            <input type="text" class="form-input" placeholder="https://api.openai.com/v1">
          </div>
          <div class="form-group">
            <label class="form-label">${p("settings.apiKey")}</label>
            <input type="password" class="form-input" placeholder="sk-...">
          </div>
          <button class="btn">${p("common.save")}</button>
        </div>
      `:""}
    `}changeLanguage(t){Ye(t),this.currentLang=t,this.requestUpdate()}};se.styles=x`
    :host { display: block; padding: 1.5rem; }
    h1 { font-size: 1.5rem; margin: 0 0 1rem 0; }
    .tabs { display: flex; gap: 0.5rem; margin-bottom: 1.5rem; border-bottom: 1px solid #2a2a4a; padding-bottom: 0.5rem; }
    .tab { padding: 0.5rem 1rem; background: transparent; border: none; color: #888; cursor: pointer; font-size: 0.9rem; border-radius: 6px; transition: all 0.2s; }
    .tab:hover { background: #2a2a4a; color: #fff; }
    .tab.active { background: #3b82f6; color: #fff; }
    .section { background: #1a1a2e; border-radius: 12px; padding: 1.5rem; margin-bottom: 1rem; }
    .section-title { font-size: 1.1rem; font-weight: 600; margin-bottom: 1rem; }
    .setting-row { display: flex; justify-content: space-between; align-items: center; padding: 0.75rem 0; border-bottom: 1px solid #2a2a4a; }
    .setting-row:last-child { border-bottom: none; }
    .setting-label { color: #a0a0b0; font-size: 0.9rem; }
    .language-selector { display: flex; gap: 0.5rem; }
    .lang-btn { padding: 0.5rem 1rem; background: #2a2a4a; border: none; border-radius: 6px; color: #fff; cursor: pointer; font-size: 0.85rem; transition: all 0.2s; }
    .lang-btn:hover { background: #3a3a5a; }
    .lang-btn.active { background: #3b82f6; }
    .form-group { margin-bottom: 1rem; }
    .form-label { display: block; font-size: 0.85rem; color: #888; margin-bottom: 0.5rem; }
    .form-input { width: 100%; padding: 0.75rem; background: #0f0f1a; border: 1px solid #2a2a4a; border-radius: 6px; color: #fff; font-size: 0.9rem; box-sizing: border-box; }
    .form-input:focus { outline: none; border-color: #3b82f6; }
    .btn { padding: 0.75rem 1.5rem; background: #3b82f6; border: none; border-radius: 6px; color: #fff; cursor: pointer; font-size: 0.9rem; }
    .btn:hover { background: #2563eb; }
  `;Qe([m()],se.prototype,"activeTab",2);se=Qe([y("settings-view")],se);const T=[{id:"security-expert",name:"安全专家",nameEn:"Security Expert",emoji:"🛡️",desc:"威胁检测、漏洞评估、事件响应、渗透测试",color:"#10b981",skillFolder:"security-expert",domains:["SEC"]},{id:"privacy-security-officer",name:"隐私安全官",nameEn:"Privacy Security Officer",emoji:"🔒",desc:"安全攻防 + 隐私保护/数据安全合规",color:"#8b5cf6",skillFolder:"privacy-officer",domains:["SEC","LEG"]},{id:"security-architect",name:"安全架构师",nameEn:"Security Architect",emoji:"🏗️",desc:"安全攻防 + 基础设施/代码/网络安全",color:"#3b82f6",skillFolder:"security-architect",domains:["SEC","IT"]},{id:"business-security-officer",name:"业务安全官",nameEn:"Business Security Officer",emoji:"💼",desc:"安全攻防 + 供应链安全/业务连续性",color:"#f59e0b",skillFolder:"business-security-officer",domains:["SEC","BIZ"]},{id:"chief-security-architect",name:"首席安全架构官",nameEn:"Chief Security Architect",emoji:"👔",desc:"安全攻防 + 合规 + 技术安全全面负责",color:"#ec4899",skillFolder:"ciso",domains:["SEC","LEG","IT"]},{id:"supply-chain-security-officer",name:"供应链安全官",nameEn:"Supply Chain Security Officer",emoji:"🔗",desc:"安全攻防 + 隐私合规 + 供应链安全",color:"#06b6d4",skillFolder:"supply-chain-security",domains:["SEC","LEG","BIZ"]},{id:"business-security-operations",name:"业务安全运营官",nameEn:"Business Security Operations",emoji:"⚙️",desc:"安全攻防 + 技术安全 + 业务连续性",color:"#14b8a6",skillFolder:"security-ops",domains:["SEC","IT","BIZ"]},{id:"secuclaw-commander",name:"全域安全指挥官",nameEn:"Enterprise Security Commander",emoji:"🎖️",desc:"完整安全攻防 + 全维度安全属性",color:"#ef4444",skillFolder:"secuclaw-commander",domains:["SEC","LEG","IT","BIZ"]}],Ht={"security-expert":"security-expert","privacy-security-officer":"privacy-officer","security-architect":"security-architect","business-security-officer":"business-security-officer","chief-security-architect":"ciso","supply-chain-security-officer":"supply-chain-security","business-security-operations":"security-ops","secuclaw-commander":"secuclaw-commander"},Vt="/skills",K=new Map;function Gt(t){const e={light:[],dark:[],security:[],legal:[],technology:[],business:[]},i=t.match(/capabilities:\s*\n([\s\S]*?)(?=\n\w|\n---|\nvisualizations:)/);if(!i)return e;const s=i[1],r=["light","dark","security","legal","technology","business"];for(const n of r){const a=s.match(new RegExp(`${n}:\\s*\\[([^\\]]*)\\]`));if(a){const c=a[1].split(",").map(l=>l.trim().replace(/^"|"$/g,"")).filter(Boolean);e[n]=c}}return e}function He(t,e){const i=t.match(new RegExp(`${e}:\\s*\\[([^\\]]*)\\]`));return i?i[1].split(",").map(s=>s.trim().replace(/^"|"$/g,"")).filter(Boolean):[]}async function qt(t){const e=Ht[t];if(!e)return null;if(K.has(e))return K.get(e)||null;try{const i=await fetch(`${Vt}/${e}/SKILL.md`);if(!i.ok)return console.warn(`Skill file not found: ${e}/SKILL.md`),K.set(e,null),null;const s=await i.text(),r=Gt(s),n=s.match(/emoji:\s*"([^"]+)"/),a=s.match(/role:\s*"([^"]+)"/),c=s.match(/combination:\s*"([^"]+)"/),l=s.match(/version:\s*"([^"]+)"/),u=s.match(/^name:\s*(\w+)/m),h=s.match(/^description:\s*(.+)$/m),d={name:u?u[1]:e,description:h?h[1]:"",emoji:n?n[1]:"🔧",role:a?a[1]:"",combination:c?c[1]:"",version:l?l[1]:"1.0.0",capabilities:r,mitre_coverage:He(s,"mitre_coverage"),scf_coverage:He(s,"scf_coverage")};return K.set(e,d),d}catch(i){return console.error(`Error loading skill ${e}:`,i),K.set(e,null),null}}var Ft=Object.defineProperty,Wt=Object.getOwnPropertyDescriptor,v=(t,e,i,s)=>{for(var r=s>1?void 0:s?Wt(e,i):e,n=t.length-1,a;n>=0;n--)(a=t[n])&&(r=(s?a(e,i,r):a(r))||r);return s&&r&&Ft(e,i,r),r};let b=class extends g{constructor(){super(...arguments),this.selectedRole="security-expert",this.viewMode="overview",this.tasks=[],this.loadedSkills=new Map,this.loadingSkills=!0,this.newTaskTitle="",this.newTaskDesc="",this.newTaskTarget="",this.newTaskPriority="medium",this.chatMessages=[],this.chatInput="",this.isChatMode=!1,this.currentChatRole="security-expert",this.activeRoleConfig="security-expert",this.showConfigPanel=!1}async connectedCallback(){super.connectedCallback();for(const t of T){const e=await qt(t.id);e&&(this.loadedSkills=new Map(this.loadedSkills).set(t.id,e))}this.loadingSkills=!1}getRoleById(t){return T.find(e=>e.id===t)}getRoleSkill(t){return this.loadedSkills.get(t)}getCoordinationStats(){const t=new Map;return this.tasks.forEach(e=>{const i=`${e.sourceRole}->${e.targetRole}`;t.set(i,(t.get(i)||0)+1)}),Array.from(t.entries()).map(([e,i])=>{const[s,r]=e.split("->");return{fromRole:s,toRole:r,taskCount:i}})}handleCreateTask(){if(!this.newTaskTitle.trim()||!this.newTaskTarget)return;const t={id:`task-${Date.now()}`,title:this.newTaskTitle,description:this.newTaskDesc,sourceRole:this.selectedRole,targetRole:this.newTaskTarget,status:"pending",priority:this.newTaskPriority,createdAt:new Date};this.tasks=[...this.tasks,t],this.newTaskTitle="",this.newTaskDesc="",this.newTaskTarget="",this.newTaskPriority="medium"}handleStatusChange(t,e){this.tasks=this.tasks.map(i=>i.id===t?{...i,status:e}:i)}handleSendMessage(){if(!this.chatInput.trim())return;const t={id:`msg-${Date.now()}`,role:"user",content:this.chatInput,timestamp:new Date,roleId:this.currentChatRole};this.chatMessages=[...this.chatMessages,t];const e=this.chatInput;this.chatInput="",setTimeout(()=>{const i=this.generateSkillBasedResponse(e);this.chatMessages=[...this.chatMessages,i]},300)}generateSkillBasedResponse(t){const e=this.getRoleById(this.currentChatRole),i=this.getRoleSkill(this.currentChatRole),s=t.toLowerCase();return s.includes("角色")||s.includes("是什么")||s.includes("谁")||s.includes("身份")?{id:`msg-${Date.now()}`,role:"assistant",content:this.buildRoleIdentityResponse(e,i),timestamp:new Date,roleId:this.currentChatRole,capabilities:i?.capabilities}:{id:`msg-${Date.now()}`,role:"assistant",content:this.buildSkillBasedResponse(t,i),timestamp:new Date,roleId:this.currentChatRole,capabilities:i?.capabilities}}buildRoleIdentityResponse(t,e){if(!t)return"未找到角色配置";const i=[`${t.emoji} 我是 ${t.name}（${t.nameEn}）`,`${t.desc}`,"",`📂 技能配置文件: /skills/${t.skillFolder}/SKILL.md`,""];return e&&(i.push("🎯 我具备以下技能领域:"),e.capabilities.light.length>0&&i.push(`  🟢 防御能力 (${e.capabilities.light.length}项): ${e.capabilities.light.slice(0,5).join("、")}${e.capabilities.light.length>5?"...":""}`),e.capabilities.dark.length>0&&i.push(`  🔴 攻击/测试能力 (${e.capabilities.dark.length}项): ${e.capabilities.dark.slice(0,5).join("、")}${e.capabilities.dark.length>5?"...":""}`),e.capabilities.security.length>0&&i.push(`  🔵 安全分析能力 (${e.capabilities.security.length}项): ${e.capabilities.security.slice(0,5).join("、")}${e.capabilities.security.length>5?"...":""}`),e.capabilities.legal.length>0&&i.push(`  🟣 合规法律能力 (${e.capabilities.legal.length}项): ${e.capabilities.legal.slice(0,5).join("、")}${e.capabilities.legal.length>5?"...":""}`),e.capabilities.technology.length>0&&i.push(`  🟠 技术能力 (${e.capabilities.technology.length}项): ${e.capabilities.technology.slice(0,5).join("、")}${e.capabilities.technology.length>5?"...":""}`),e.capabilities.business.length>0&&i.push(`  🩷 业务能力 (${e.capabilities.business.length}项): ${e.capabilities.business.slice(0,5).join("、")}${e.capabilities.business.length>5?"...":""}`),e.mitre_coverage.length>0&&(i.push(""),i.push(`🛡️ MITRE ATT&CK 覆盖: ${e.mitre_coverage.slice(0,5).join("、")}...`)),e.scf_coverage.length>0&&i.push(`📋 SCF框架覆盖: ${e.scf_coverage.slice(0,5).join("、")}...`)),i.push(""),i.push(`💡 当前激活角色: ${this.currentChatRole}`),i.push(`🔄 技能来源: 读取自 ai_secuclaw/secuclaw/skills/${t.skillFolder}/SKILL.md`),i.join(`
`)}buildSkillBasedResponse(t,e){if(!e)return"技能配置加载中，请稍候...";const i=this.getRoleById(this.currentChatRole);let s=`${i?.emoji} ${i?.name} 响应:

`;const r=[{key:"light",label:"防御能力",emoji:"🟢"},{key:"dark",label:"攻击/测试能力",emoji:"🔴"},{key:"security",label:"安全分析能力",emoji:"🔵"},{key:"legal",label:"合规法律能力",emoji:"🟣"},{key:"technology",label:"技术能力",emoji:"🟠"},{key:"business",label:"业务能力",emoji:"🩷"}];for(const n of r){const a=e.capabilities[n.key];a.length>0&&(s+=`${n.emoji} ${n.label}: ${a.join("、")}
`)}return s+=`
📂 技能配置来源: ai_secuclaw/secuclaw/skills/${i?.skillFolder}/SKILL.md`,s}switchChatRole(t){this.currentChatRole=t,this.activeRoleConfig=t;const e=this.getRoleById(t),i=this.getRoleSkill(t),s={id:`msg-${Date.now()}`,role:"assistant",content:`已切换到 ${e?.emoji} ${e?.name}，技能配置已更新为 /skills/${e?.skillFolder}/SKILL.md`,timestamp:new Date,roleId:t,capabilities:i?.capabilities};this.chatMessages=[...this.chatMessages,s]}renderCapabilitySection(t){return t?o`
      <div class="capability-section">
        ${[{key:"light",label:"🟢 防御能力",emoji:"🟢"},{key:"dark",label:"🔴 攻击能力",emoji:"🔴"},{key:"security",label:"🔵 安全能力",emoji:"🔵"},{key:"legal",label:"🟣 合规能力",emoji:"🟣"},{key:"technology",label:"🟠 技术能力",emoji:"🟠"},{key:"business",label:"🩷 业务能力",emoji:"🩷"}].map(i=>{const s=t[i.key];return!s||s.length===0?"":o`
            <div class="capability-type ${i.key}">${i.label}</div>
            <div class="capability-list">
              ${s.map(r=>o`<span class="capability-item">${r}</span>`)}
            </div>
          `})}
      </div>
    `:""}renderChatMode(){return o`
      <div class="chat-container">
        <div class="role-selector">
          ${T.map(t=>o`
            <button 
              class="role-chip ${this.currentChatRole===t.id?"active":""}"
              @click=${()=>this.switchChatRole(t.id)}
            >
              ${t.emoji} ${t.name}
            </button>
          `)}
        </div>
        
        <div class="chat-messages">
          ${this.chatMessages.length===0?o`
            <div class="empty-state">
              <div style="font-size: 2rem; margin-bottom: 0.5rem;">🤖</div>
              <div>选择上方角色，然后输入问题</div>
              <div style="font-size: 0.8rem; margin-top: 0.5rem; color: #666;">试试问: "你的角色是什么"</div>
            </div>
          `:this.chatMessages.map(t=>o`
            <div class="chat-message ${t.role}">
              <div class="msg-role">${t.role==="user"?"你":this.getRoleById(t.roleId||"")?.name||"AI"}</div>
              <div class="msg-content">${t.content}</div>
              ${t.capabilities?this.renderCapabilitySection(t.capabilities):""}
            </div>
          `)}
        </div>
        
        <div class="chat-input-container">
          <input 
            type="text" 
            class="chat-input" 
            placeholder="输入问题... (试试: 你的角色是什么)"
            .value=${this.chatInput}
            @input=${t=>this.chatInput=t.target.value}
            @keydown=${t=>t.key==="Enter"&&this.handleSendMessage()}
          />
          <button class="chat-send-btn" @click=${this.handleSendMessage}>发送</button>
        </div>
      </div>
    `}renderConfigPanel(){return o`
      <div class="config-panel">
        <div class="config-title">⚙️ 角色配置管理</div>
        <div class="config-grid">
          ${T.map(t=>o`
            <div 
              class="config-item ${this.activeRoleConfig===t.id?"active":""}"
              @click=${()=>{this.activeRoleConfig=t.id,this.currentChatRole=t.id}}
            >
              <div class="config-item-icon">${t.emoji}</div>
              <div class="config-item-name">${t.name}</div>
              <div class="config-item-path">/skills/${t.skillFolder}/SKILL.md</div>
            </div>
          `)}
        </div>
      </div>
    `}renderCapabilityGroup(t,e,i){return o`
      <div class="capability-group">
        <div class="capability-label">${t} ${e.length>0?`(${e.length})`:"(0)"}</div>
        <div class="capability-grid">
          ${e.length>0?e.map(s=>o`<span class="capability-tag ${i}">${s}</span>`):o`<span class="capability-tag" style="opacity: 0.5;">暂无配置</span>`}
        </div>
      </div>
    `}render(){return this.loadingSkills?o`<div class="loading">加载技能配置中...</div>`:o`
      <header>
        <h1>🤖 AI安全专家配置</h1>
        <div class="view-toggle">
          <button class="toggle-btn ${this.viewMode==="overview"?"active":""}" @click=${()=>this.viewMode="overview"}>👥 角色总览</button>
          <button class="toggle-btn ${this.viewMode==="role-detail"?"active":""}" @click=${()=>this.viewMode="role-detail"}>🔍 角色详情</button>
          <button class="toggle-btn ${this.viewMode==="chat"?"active":""}" @click=${()=>this.viewMode="chat"}>💬 角色问答</button>
          <button class="toggle-btn ${this.viewMode==="config"?"active":""}" @click=${()=>this.viewMode="config"}>⚙️ 配置管理</button>
          <button class="toggle-btn ${this.viewMode==="coordination"?"active":""}" @click=${()=>this.viewMode="coordination"}>🔗 任务协调</button>
        </div>
      </header>
      <div class="content">
        ${this.viewMode==="overview"?this.renderOverview():""}
        ${this.viewMode==="role-detail"?this.renderRoleDetail():""}
        ${this.viewMode==="chat"?this.renderChatMode():""}
        ${this.viewMode==="config"?this.renderConfigPanel():""}
        ${this.viewMode==="coordination"?this.renderCoordination():""}
      </div>
    `}renderOverview(){return o`
      <div class="roles-grid">
        ${T.map(t=>{const e=this.getRoleSkill(t.id),i=this.tasks.filter(a=>a.sourceRole===t.id||a.targetRole===t.id),s=i.filter(a=>a.targetRole===t.id&&a.status!=="completed").length,r=i.filter(a=>a.sourceRole===t.id).length,n=e?e.capabilities.light.length+e.capabilities.dark.length+e.capabilities.security.length+e.capabilities.legal.length+e.capabilities.technology.length+e.capabilities.business.length:0;return o`
            <div class="role-card ${this.selectedRole===t.id?"selected":""}" @click=${()=>{this.selectedRole=t.id,this.viewMode="role-detail"}}>
              <div class="role-header">
                <div class="role-icon" style="background: ${t.color}20">${t.emoji}</div>
                <div class="role-info">
                  <h3>${t.name}</h3>
                  <div class="name-en">${t.nameEn}</div>
                </div>
              </div>
              <div class="role-desc">${t.desc}</div>
              <div class="skills-list">
                ${e?o`
                  <span class="skill-tag" style="color: #22c55e">🟢 ${e.capabilities.light.length}</span>
                  <span class="skill-tag" style="color: #ef4444">🔴 ${e.capabilities.dark.length}</span>
                  <span class="skill-tag" style="color: #3b82f6">🔵 ${e.capabilities.security.length}</span>
                  <span class="skill-tag" style="color: #8b5cf6">🟣 ${e.capabilities.legal.length}</span>
                  <span class="skill-tag" style="color: #f59e0b">🟠 ${e.capabilities.technology.length}</span>
                  <span class="skill-tag" style="color: #ec4899">🩷 ${e.capabilities.business.length}</span>
                `:o`<span class="skill-tag">加载中...</span>`}
              </div>
              <div class="domain-tags">${t.domains.map(a=>o`<span class="domain-tag">${a}</span>`)}</div>
              <div class="role-stats">
                <div class="stat"><div class="stat-value">${s}</div><div class="stat-label">待处理</div></div>
                <div class="stat"><div class="stat-value">${r}</div><div class="stat-label">协调</div></div>
                <div class="stat"><div class="stat-value">${n}</div><div class="stat-label">技能总数</div></div>
              </div>
            </div>
          `})}
      </div>
    `}renderRoleDetail(){const t=this.getRoleById(this.selectedRole);if(!t)return o`<div class="empty-state">请选择角色</div>`;const e=this.getRoleSkill(t.id),i=this.tasks.filter(s=>s.sourceRole===t.id||s.targetRole===t.id);return o`
      <div class="detail-header">
        <button class="back-btn" @click=${()=>this.viewMode="overview"}>←</button>
        <div class="detail-icon" style="background: ${t.color}20">${t.emoji}</div>
        <div class="detail-info">
          <h2>${t.name} <span style="color: #888; font-weight: normal;">${t.nameEn}</span></h2>
          <p>${t.desc}</p>
        </div>
      </div>

      ${e?o`
        <div class="detail-section">
          <div class="section-title">${e.emoji} ${e.name} - 技能配置</div>
          <p style="color: #888; font-size: 0.85rem; margin-bottom: 1rem;">${e.description}</p>
          
          ${this.renderCapabilityGroup("🟢 防御能力 (Light)",e.capabilities.light,"light")}
          ${this.renderCapabilityGroup("🔴 攻击能力 (Dark)",e.capabilities.dark,"dark")}
          ${this.renderCapabilityGroup("🔵 安全能力 (Security)",e.capabilities.security,"security")}
          ${this.renderCapabilityGroup("🟣 法律合规 (Legal)",e.capabilities.legal,"legal")}
          ${this.renderCapabilityGroup("🟠 技术能力 (Technology)",e.capabilities.technology,"technology")}
          ${this.renderCapabilityGroup("🩷 业务能力 (Business)",e.capabilities.business,"business")}

          <div class="coverage-section">
            <div class="coverage-title">MITRE ATT&CK 覆盖: ${e.mitre_coverage.length} 项</div>
            <div class="coverage-tags">
              ${e.mitre_coverage.slice(0,10).map(s=>o`<span class="coverage-tag">${s}</span>`)}
              ${e.mitre_coverage.length>10?o`<span class="coverage-tag">+${e.mitre_coverage.length-10}</span>`:""}
            </div>
          </div>

          <div class="coverage-section">
            <div class="coverage-title">SCF 控制框架覆盖: ${e.scf_coverage.length} 项</div>
            <div class="coverage-tags">
              ${e.scf_coverage.slice(0,10).map(s=>o`<span class="coverage-tag">${s}</span>`)}
              ${e.scf_coverage.length>10?o`<span class="coverage-tag">+${e.scf_coverage.length-10}</span>`:""}
            </div>
          </div>
        </div>
      `:o`<div class="detail-section"><div class="empty-state">无法加载技能配置</div></div>`}

      <div class="detail-section">
        <div class="section-title">📋 相关任务</div>
        ${i.length===0?o`<div class="empty-state">暂无任务</div>`:o`
          <div class="task-list">
            ${i.map(s=>o`
              <div class="task-item">
                <div class="task-header">
                  <span class="task-title">${s.title}</span>
                  <span class="priority-badge ${s.priority}">${s.priority}</span>
                </div>
                <div class="task-desc">${s.description}</div>
                <div class="task-footer">
                  <span>${s.sourceRole===t.id?"→ 分配给":"← 来自"}: ${s.sourceRole===t.id?this.getRoleById(s.targetRole)?.name:this.getRoleById(s.sourceRole)?.name}</span>
                  <select class="task-status ${s.status}" style="background: transparent; border: none; color: inherit;" .value=${s.status} @change=${r=>this.handleStatusChange(s.id,r.target.value)}>
                    <option value="pending">待处理</option>
                    <option value="in-progress">进行中</option>
                    <option value="completed">已完成</option>
                  </select>
                </div>
              </div>
            `)}
          </div>
        `}
      </div>
    `}renderCoordination(){const t=this.getCoordinationStats();return o`
      <div class="coordination-grid">
        <div class="task-panel">
          <h3>📤 分配任务</h3>
          <div class="task-form">
            <input type="text" placeholder="任务标题" .value=${this.newTaskTitle} @input=${e=>this.newTaskTitle=e.target.value} />
            <textarea placeholder="任务描述" .value=${this.newTaskDesc} @input=${e=>this.newTaskDesc=e.target.value}></textarea>
            <select .value=${this.newTaskTarget} @change=${e=>this.newTaskTarget=e.target.value}>
              <option value="">选择目标角色</option>
              ${T.filter(e=>e.id!==this.selectedRole).map(e=>o`<option value=${e.id}>${e.emoji} ${e.name}</option>`)}
            </select>
            <select .value=${this.newTaskPriority} @change=${e=>this.newTaskPriority=e.target.value}>
              <option value="low">低优先级</option>
              <option value="medium">中优先级</option>
              <option value="high">高优先级</option>
              <option value="critical">紧急</option>
            </select>
            <button class="submit-btn" @click=${this.handleCreateTask}>创建任务</button>
          </div>

          <div class="task-list">
            ${this.tasks.filter(e=>e.sourceRole===this.selectedRole).map(e=>o`
              <div class="task-item">
                <div class="task-header">
                  <span class="task-title">${e.title}</span>
                  <span class="priority-badge ${e.priority}">${e.priority}</span>
                </div>
                <div class="task-desc">${e.description}</div>
                <div class="task-footer">
                  <span>→ ${this.getRoleById(e.targetRole)?.name}</span>
                  <span class="task-status ${e.status}">${e.status==="pending"?"待处理":e.status==="in-progress"?"进行中":"已完成"}</span>
                </div>
              </div>
            `)}
            ${this.tasks.filter(e=>e.sourceRole===this.selectedRole).length===0?o`<div class="empty-state">暂无分配的任务</div>`:""}
          </div>
        </div>

        <div class="coordination-stats">
          <h3 class="section-title">📊 协调统计</h3>
          ${t.length===0?o`<div class="empty-state">暂无协调数据</div>`:o`
            ${t.map(e=>o`
              <div class="coordination-item">
                <div class="coordination-roles">
                  <span>${this.getRoleById(e.fromRole)?.emoji}</span>
                  <span>${this.getRoleById(e.fromRole)?.name}</span>
                  <span class="coordination-arrow">→</span>
                  <span>${this.getRoleById(e.toRole)?.emoji}</span>
                  <span>${this.getRoleById(e.toRole)?.name}</span>
                </div>
                <span class="coordination-count">${e.taskCount} 任务</span>
              </div>
            `)}
          `}
        </div>
      </div>
    `}};b.styles=x`
    :host { display: flex; flex-direction: column; height: 100%; background: #0f0f1a; color: #fff; font-family: system-ui, -apple-system, sans-serif; }
    header { padding: 1.25rem 1.5rem; border-bottom: 1px solid #2a2a4a; display: flex; justify-content: space-between; align-items: center; }
    h1 { font-size: 1.25rem; margin: 0; display: flex; align-items: center; gap: 0.5rem; }
    .view-toggle { display: flex; gap: 0.5rem; }
    .toggle-btn { padding: 0.5rem 1rem; background: transparent; border: 1px solid #2a2a4a; border-radius: 6px; color: #888; cursor: pointer; font-size: 0.85rem; transition: all 0.2s; }
    .toggle-btn:hover { background: #2a2a4a; color: #fff; }
    .toggle-btn.active { background: #3b82f6; border-color: #3b82f6; color: #fff; }
    .content { flex: 1; overflow-y: auto; padding: 1.5rem; }
    .roles-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 1rem; }
    .role-card { background: #1a1a2e; border-radius: 12px; padding: 1.25rem; border: 1px solid #2a2a4a; cursor: pointer; transition: all 0.2s; }
    .role-card:hover { border-color: #3b82f6; transform: translateY(-2px); }
    .role-card.selected { border-color: #3b82f6; box-shadow: 0 0 20px #3b82f620; }
    .role-header { display: flex; align-items: flex-start; gap: 1rem; margin-bottom: 1rem; }
    .role-icon { width: 48px; height: 48px; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 1.5rem; flex-shrink: 0; }
    .role-info h3 { margin: 0 0 0.25rem 0; font-size: 1rem; font-weight: 600; }
    .role-info .name-en { font-size: 0.7rem; color: #888; }
    .role-desc { font-size: 0.8rem; color: #aaa; margin-bottom: 1rem; line-height: 1.4; }
    .skills-list { display: flex; flex-wrap: wrap; gap: 0.4rem; }
    .skill-tag { font-size: 0.7rem; background: #2a2a4a; padding: 0.25rem 0.5rem; border-radius: 4px; color: #aaa; }
    .role-stats { display: flex; gap: 1rem; margin-top: 1rem; padding-top: 1rem; border-top: 1px solid #2a2a4a; }
    .stat { text-align: center; }
    .stat-value { font-size: 1.1rem; font-weight: 600; color: #3b82f6; }
    .stat-label { font-size: 0.65rem; color: #666; }
    .detail-header { display: flex; align-items: center; gap: 1rem; margin-bottom: 1.5rem; }
    .back-btn { padding: 0.5rem; background: #2a2a4a; border: none; border-radius: 6px; color: #fff; cursor: pointer; font-size: 1rem; }
    .detail-icon { width: 56px; height: 56px; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 1.75rem; }
    .detail-info h2 { margin: 0 0 0.25rem 0; font-size: 1.25rem; }
    .detail-info p { margin: 0; color: #888; font-size: 0.85rem; }
    .detail-section { background: #1a1a2e; border-radius: 12px; padding: 1.25rem; margin-bottom: 1rem; border: 1px solid #2a2a4a; }
    .section-title { font-size: 0.9rem; font-weight: 600; margin-bottom: 1rem; display: flex; align-items: center; gap: 0.5rem; }
    .capability-group { margin-bottom: 1rem; }
    .capability-group:last-child { margin-bottom: 0; }
    .capability-label { font-size: 0.75rem; color: #888; margin-bottom: 0.5rem; text-transform: uppercase; letter-spacing: 0.5px; }
    .capability-grid { display: flex; flex-wrap: wrap; gap: 0.4rem; }
    .capability-tag { font-size: 0.75rem; padding: 0.3rem 0.6rem; border-radius: 4px; }
    .capability-tag.light { background: #22c55e20; color: #22c55e; }
    .capability-tag.dark { background: #ef444420; color: #ef4444; }
    .capability-tag.security { background: #3b82f620; color: #3b82f6; }
    .capability-tag.legal { background: #8b5cf620; color: #8b5cf6; }
    .capability-tag.technology { background: #f59e0b20; color: #f59e0b; }
    .capability-tag.business { background: #ec489920; color: #ec4899; }
    .coverage-section { margin-top: 1rem; padding-top: 1rem; border-top: 1px solid #2a2a4a; }
    .coverage-title { font-size: 0.8rem; color: #888; margin-bottom: 0.5rem; }
    .coverage-tags { display: flex; flex-wrap: wrap; gap: 0.3rem; }
    .coverage-tag { font-size: 0.65rem; background: #2a2a4a; padding: 0.2rem 0.4rem; border-radius: 3px; color: #aaa; }
    .coordination-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem; }
    .task-panel { background: #1a1a2e; border-radius: 12px; padding: 1.25rem; border: 1px solid #2a2a4a; }
    .task-panel h3 { margin: 0 0 1rem 0; font-size: 1rem; display: flex; align-items: center; gap: 0.5rem; }
    .task-form { margin-bottom: 1rem; }
    .task-form input, .task-form select, .task-form textarea { width: 100%; padding: 0.6rem; background: #0f0f1a; border: 1px solid #2a2a4a; border-radius: 6px; color: #fff; font-size: 0.85rem; margin-bottom: 0.5rem; }
    .task-form textarea { min-height: 60px; resize: vertical; }
    .submit-btn { width: 100%; padding: 0.6rem; background: #3b82f6; border: none; border-radius: 6px; color: #fff; cursor: pointer; font-size: 0.85rem; }
    .submit-btn:hover { background: #2563eb; }
    .task-list { max-height: 300px; overflow-y: auto; }
    .task-item { background: #0f0f1a; padding: 0.75rem; border-radius: 8px; margin-bottom: 0.5rem; }
    .task-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.5rem; }
    .task-title { font-weight: 500; font-size: 0.85rem; }
    .priority-badge { font-size: 0.65rem; padding: 0.15rem 0.4rem; border-radius: 4px; font-weight: 500; }
    .priority-badge.critical { background: #ef444420; color: #ef4444; }
    .priority-badge.high { background: #f59e0b20; color: #f59e0b; }
    .priority-badge.medium { background: #3b82f620; color: #3b82f6; }
    .priority-badge.low { background: #22c55e20; color: #22c55e; }
    .task-desc { font-size: 0.75rem; color: #888; margin-bottom: 0.5rem; }
    .task-footer { display: flex; justify-content: space-between; align-items: center; font-size: 0.7rem; color: #666; }
    .task-status { padding: 0.15rem 0.4rem; border-radius: 4px; background: #2a2a4a; }
    .task-status.pending { color: #f59e0b; }
    .task-status.in-progress { color: #3b82f6; }
    .task-status.completed { color: #22c55e; }
    .coordination-stats { background: #1a1a2e; border-radius: 12px; padding: 1.25rem; border: 1px solid #2a2a4a; }
    .coordination-item { display: flex; align-items: center; justify-content: space-between; padding: 0.75rem 0; border-bottom: 1px solid #2a2a4a; }
    .coordination-item:last-child { border-bottom: none; }
    .coordination-roles { display: flex; align-items: center; gap: 0.5rem; font-size: 0.85rem; }
    .coordination-arrow { color: #666; }
    .coordination-count { background: #3b82f620; color: #3b82f6; padding: 0.25rem 0.6rem; border-radius: 12px; font-size: 0.8rem; font-weight: 500; }
    .empty-state { text-align: center; padding: 2rem; color: #666; }
    .domain-tags { display: flex; gap: 0.5rem; margin-top: 0.5rem; }
    .domain-tag { font-size: 0.65rem; padding: 0.15rem 0.4rem; border-radius: 4px; background: #2a2a4a; color: #888; }
    .loading { display: flex; justify-content: center; align-items: center; height: 200px; color: #888; }
    /* Chat mode styles */
    .chat-container { display: flex; flex-direction: column; height: 100%; gap: 1rem; }
    .role-selector { display: flex; gap: 0.5rem; flex-wrap: wrap; padding: 0.75rem; background: #1a1a2e; border-radius: 8px; margin-bottom: 0.5rem; }
    .role-chip { padding: 0.4rem 0.8rem; border-radius: 20px; font-size: 0.75rem; cursor: pointer; transition: all 0.2s; border: 1px solid #2a2a4a; background: transparent; color: #888; }
    .role-chip:hover { border-color: #3b82f6; color: #fff; }
    .role-chip.active { background: #3b82f6; border-color: #3b82f6; color: #fff; }
    .chat-messages { flex: 1; overflow-y: auto; display: flex; flex-direction: column; gap: 1rem; padding: 0.5rem; }
    .chat-message { max-width: 85%; padding: 0.75rem 1rem; border-radius: 12px; font-size: 0.9rem; line-height: 1.5; }
    .chat-message.user { align-self: flex-end; background: #3b82f6; }
    .chat-message.assistant { align-self: flex-start; background: #1a1a2e; border: 1px solid #2a2a4a; }
    .chat-message .msg-role { font-size: 0.7rem; opacity: 0.7; margin-bottom: 0.25rem; }
    .chat-message .msg-content { white-space: pre-wrap; }
    .chat-message .capability-section { margin-top: 0.75rem; padding-top: 0.75rem; border-top: 1px solid #2a2a4a; }
    .chat-message .capability-type { font-size: 0.75rem; font-weight: 600; margin-bottom: 0.4rem; display: flex; align-items: center; gap: 0.3rem; }
    .chat-message .capability-type.light { color: #22c55e; }
    .chat-message .capability-type.dark { color: #ef4444; }
    .chat-message .capability-type.security { color: #3b82f6; }
    .chat-message .capability-type.legal { color: #8b5cf6; }
    .chat-message .capability-type.technology { color: #f59e0b; }
    .chat-message .capability-type.business { color: #ec4899; }
    .chat-message .capability-list { display: flex; flex-wrap: wrap; gap: 0.3rem; }
    .chat-message .capability-item { font-size: 0.7rem; background: #2a2a4a; padding: 0.2rem 0.5rem; border-radius: 4px; }
    .chat-input-container { display: flex; gap: 0.5rem; padding: 0.75rem; background: #1a1a2e; border-radius: 12px; }
    .chat-input { flex: 1; padding: 0.6rem 1rem; background: #0f0f1a; border: 1px solid #2a2a4a; border-radius: 8px; color: #fff; font-size: 0.9rem; }
    .chat-input:focus { outline: none; border-color: #3b82f6; }
    .chat-send-btn { padding: 0.6rem 1.2rem; background: #3b82f6; border: none; border-radius: 8px; color: #fff; cursor: pointer; font-size: 0.9rem; }
    .chat-send-btn:hover { background: #2563eb; }
    .config-panel { background: #1a1a2e; border-radius: 12px; padding: 1.25rem; border: 1px solid #2a2a4a; margin-bottom: 1rem; }
    .config-title { font-size: 1rem; font-weight: 600; margin-bottom: 1rem; display: flex; align-items: center; gap: 0.5rem; }
    .config-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 0.75rem; }
    .config-item { padding: 0.75rem; background: #0f0f1a; border-radius: 8px; border: 1px solid #2a2a4a; cursor: pointer; transition: all 0.2s; }
    .config-item:hover { border-color: #3b82f6; }
    .config-item.active { border-color: #3b82f6; background: #3b82f620; }
    .config-item-icon { font-size: 1.5rem; margin-bottom: 0.5rem; }
    .config-item-name { font-size: 0.85rem; font-weight: 500; }
    .config-item-path { font-size: 0.7rem; color: #666; margin-top: 0.25rem; }
  `;v([m()],b.prototype,"selectedRole",2);v([m()],b.prototype,"viewMode",2);v([m()],b.prototype,"tasks",2);v([m()],b.prototype,"loadedSkills",2);v([m()],b.prototype,"loadingSkills",2);v([m()],b.prototype,"newTaskTitle",2);v([m()],b.prototype,"newTaskDesc",2);v([m()],b.prototype,"newTaskTarget",2);v([m()],b.prototype,"newTaskPriority",2);v([m()],b.prototype,"chatMessages",2);v([m()],b.prototype,"chatInput",2);v([m()],b.prototype,"isChatMode",2);v([m()],b.prototype,"currentChatRole",2);v([m()],b.prototype,"activeRoleConfig",2);v([m()],b.prototype,"showConfigPanel",2);b=v([y("ai-experts-view")],b);var Zt=Object.defineProperty,Jt=Object.getOwnPropertyDescriptor,Xe=(t,e,i,s)=>{for(var r=s>1?void 0:s?Jt(e,i):e,n=t.length-1,a;n>=0;n--)(a=t[n])&&(r=(s?a(e,i,r):a(r))||r);return s&&r&&Zt(e,i,r),r};const ce=[{code:"zh-CN",name:"简体中文",native:"简体中文",flag:"🇨🇳"},{code:"en-US",name:"English",native:"English",flag:"🇺🇸"}];let re=class extends g{constructor(){super(...arguments),this.i18n=new I(this),this.isOpen=!1}get currentLang(){return Z.getLocale()}toggleDropdown(){this.isOpen=!this.isOpen}closeDropdown(){this.isOpen=!1}selectLanguage(t){Ye(t),this.closeDropdown()}getCurrentLanguageInfo(){return ce.find(t=>t.code===this.currentLang)||ce[0]}render(){const t=this.getCurrentLanguageInfo();return o`
      <div class="language-selector" @blur=${this.closeDropdown} tabindex="0">
        <button 
          class="language-btn" 
          @click=${this.toggleDropdown}
          aria-label="Select language"
        >
          <span class="language-flag">${t.flag}</span>
          <span class="language-name">${t.native}</span>
          <span class="dropdown-arrow">▼</span>
        </button>
        
        <div class="dropdown ${this.isOpen?"open":""}">
          ${ce.map(e=>o`
            <button 
              class="dropdown-item ${e.code===this.currentLang?"active":""}"
              @click=${()=>this.selectLanguage(e.code)}
            >
              <span class="language-flag">${e.flag}</span>
              <span>${e.native}</span>
            </button>
          `)}
        </div>
      </div>
    `}};re.styles=x`
    :host {
      display: inline-block;
    }

    .language-selector {
      position: relative;
      display: inline-block;
    }

    .language-btn {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.5rem 0.75rem;
      background: #1a1a2e;
      border: 1px solid #2a2a4a;
      border-radius: 6px;
      color: #fff;
      cursor: pointer;
      font-size: 0.8rem;
      transition: all 0.2s;
    }

    .language-btn:hover {
      background: #2a2a4a;
    }

    .language-flag {
      font-size: 1rem;
    }

    .language-name {
      flex: 1;
    }

    .dropdown-arrow {
      font-size: 0.6rem;
      color: #888;
    }

    .dropdown {
      position: absolute;
      top: 100%;
      left: 0;
      margin-top: 0.25rem;
      min-width: 140px;
      background: #1a1a2e;
      border: 1px solid #2a2a4a;
      border-radius: 6px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
      z-index: 1000;
      overflow: hidden;
      display: none;
    }

    .dropdown.open {
      display: block;
    }

    .dropdown-item {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.625rem 0.75rem;
      color: #a0a0b0;
      cursor: pointer;
      font-size: 0.8rem;
      transition: all 0.2s;
      border: none;
      background: none;
      width: 100%;
      text-align: left;
    }

    .dropdown-item:hover {
      background: #2a2a4a;
      color: #fff;
    }

    .dropdown-item.active {
      background: #3b82f6;
      color: #fff;
    }
  `;Xe([m()],re.prototype,"isOpen",2);re=Xe([y("language-switcher")],re);var Yt=Object.defineProperty,Qt=Object.getOwnPropertyDescriptor,ae=(t,e,i,s)=>{for(var r=s>1?void 0:s?Qt(e,i):e,n=t.length-1,a;n>=0;n--)(a=t[n])&&(r=(s?a(e,i,r):a(r))||r);return s&&r&&Yt(e,i,r),r};const Xt=[{id:"security-expert",nameKey:"roles.securityExpert",descKey:"roles.securityExpertDesc",emoji:"🛡️"},{id:"privacy-security-officer",nameKey:"roles.privacyOfficer",descKey:"roles.privacyOfficerDesc",emoji:"🔒"},{id:"security-architect",nameKey:"roles.securityArchitect",descKey:"roles.securityArchitectDesc",emoji:"🏗️"},{id:"business-security-officer",nameKey:"roles.businessSecurityOfficer",descKey:"roles.businessSecurityOfficerDesc",emoji:"💼"},{id:"chief-security-architect",nameKey:"roles.ciso",descKey:"roles.cisoDesc",emoji:"👔"},{id:"supply-chain-security-officer",nameKey:"roles.supplyChainOfficer",descKey:"roles.supplyChainOfficerDesc",emoji:"🔗"},{id:"business-security-operations",nameKey:"roles.securityOpsOfficer",descKey:"roles.securityOpsOfficerDesc",emoji:"⚙️"},{id:"secuclaw-commander",nameKey:"roles.commander",descKey:"roles.commanderDesc",emoji:"🎖️"}],ei=[{id:"builtin",labelKey:"nav.builtin",items:["ai-experts","dashboard","knowledge"]},{id:"skills",labelKey:"nav.skills",items:["skills-market","settings"]},{id:"extensions",labelKey:"nav.extensions",items:["messaging","threat-intel","security-incidents","vulnerability-management","analysis-reports","compliance-audit","security-risk","warroom"]}],ti={"ai-experts":{id:"ai-experts",labelKey:"nav.chat",icon:"🤖",color:"#3b82f6"},"skills-market":{id:"skills-market",labelKey:"nav.skills",icon:"📦",color:"#a855f7"},settings:{id:"settings",labelKey:"nav.settings",icon:"⚙️",color:"#64748b"},dashboard:{id:"dashboard",labelKey:"nav.dashboard",icon:"📊",color:"#3b82f6"},knowledge:{id:"knowledge",labelKey:"nav.knowledge",icon:"🧠",color:"#6366f1"},"threat-intel":{id:"threat-intel",labelKey:"nav.threatIntel",icon:"🔍",color:"#ef4444"},"security-incidents":{id:"security-incidents",labelKey:"nav.securityIncidents",icon:"🚨",color:"#ef4444"},"vulnerability-management":{id:"vulnerability-management",labelKey:"nav.vulnManagement",icon:"🔴",color:"#f97316"},"analysis-reports":{id:"analysis-reports",labelKey:"nav.analysisReports",icon:"📈",color:"#3b82f6"},"compliance-audit":{id:"compliance-audit",labelKey:"nav.compliance",icon:"📝",color:"#06b6d4"},"security-risk":{id:"security-risk",labelKey:"nav.securityRisk",icon:"⚡",color:"#f59e0b"},warroom:{id:"warroom",labelKey:"nav.warroom",icon:"🎯",color:"#f97316"},messaging:{id:"messaging",labelKey:"nav.messaging",icon:"💬",color:"#8b5cf6"}};let z=class extends g{constructor(){super(...arguments),this.i18n=new I(this),this.currentPage="dashboard",this.installedSkills=["dashboard","knowledge","messaging","threat-intel","security-incidents","vulnerability-management","analysis-reports","compliance-audit","security-risk","warroom"],this.selectedRole="security-expert",this.collapsedGroups=new Set,this.handleSkillToggle=t=>{const{skillId:e,enabled:i}=t.detail;i?this.installedSkills.includes(e)||(this.installedSkills=[...new Set([...this.installedSkills,e])]):this.installedSkills=this.installedSkills.filter(s=>s!==e),this.saveInstalledSkills()}}connectedCallback(){super.connectedCallback(),this.loadInstalledSkills(),_t(),le.subscribe(()=>{this.requestUpdate()}),setTimeout(()=>{le.value!=="connected"&&Ke()},500)}loadInstalledSkills(){const t=localStorage.getItem("secuclaw-installed-skills");if(t)try{const e=JSON.parse(t),i=[...new Set(e)];i.length!==e.length?(console.log("[Skills] Found duplicate skills, resetting to defaults"),this.installedSkills=["dashboard","knowledge"],localStorage.setItem("secuclaw-installed-skills",JSON.stringify(this.installedSkills))):this.installedSkills=i}catch{}}saveInstalledSkills(){localStorage.setItem("secuclaw-installed-skills",JSON.stringify(this.installedSkills))}renderConnectionStatus(){const t=le.value,e=Ze.value,i=p(t==="connected"?"connection.connected":t==="connecting"?"connection.connecting":"connection.disconnected");return o`
      <div class="connection-status ${t}">
        <span class="connection-dot ${t}"></span>
        <span style="flex: 1">${i} ${e}</span>
        ${t!=="connected"?o`
          <button 
            class="connect-btn"
            @click=${()=>Ke()}
            ?disabled=${t==="connecting"}
          >
            ${t==="connecting"?"...":p("connection.connect")}
          </button>
        `:""}
      </div>
    `}renderNavItems(){return ei.map(t=>{const e=t.items.map(s=>ti[s]).filter(s=>s?t.id==="core"||t.id==="builtin"||t.id==="skills"?!0:this.installedSkills.includes(s.id):!1);if(e.length===0)return null;const i=this.collapsedGroups.has(t.id);return o`
        <div class="nav-group">
          <div class="nav-group-header" @click=${()=>this.toggleGroup(t.id)}>
            <span class="arrow ${i?"collapsed":""}">▼</span>
            <span>${p(t.labelKey)}</span>
          </div>
          <div class="nav-group-items ${i?"collapsed":""}">
            ${e.map(s=>o`
              <button 
                class="nav-item ${this.currentPage===s.id?"active":""}"
                style="--nav-color: ${s.color}"
                @click=${()=>this.currentPage=s.id}
              >
                <span class="nav-icon">${s.icon}</span>
                <span style="flex: 1">${p(s.labelKey)}</span>
              </button>
            `)}
          </div>
        </div>
      `})}toggleGroup(t){const e=new Set(this.collapsedGroups);e.has(t)?e.delete(t):e.add(t),this.collapsedGroups=e}renderRoleSelector(){return this.currentPage!=="chat"?null:o`
      <div class="role-selector">
        <div class="role-selector-title">${p("roles.selectRole")}</div>
        ${Xt.map(t=>o`
          <button 
            class="role-item ${this.selectedRole===t.id?"active":""}"
            @click=${()=>this.selectedRole=t.id}
            title=${p(t.descKey)}
          >
            <span class="role-emoji">${t.emoji}</span>
            <span class="role-name">${p(t.nameKey)}</span>
          </button>
        `)}
      </div>
    `}renderMainContent(){switch(this.currentPage){case"dashboard":return o`<dashboard-view .roleId=${this.selectedRole}></dashboard-view>`;case"chat":return o`<chat-view .roleId=${this.selectedRole}></chat-view>`;case"knowledge":return o`<knowledge-view></knowledge-view>`;case"threat-intel":return o`<threat-intel-view></threat-intel-view>`;case"security-incidents":return o`<security-incidents-view></security-incidents-view>`;case"vulnerability-management":return o`<vulnerability-management-view></vulnerability-management-view>`;case"analysis-reports":return o`<analysis-reports-view></analysis-reports-view>`;case"compliance-audit":return o`<compliance-audit-view></compliance-audit-view>`;case"security-risk":return o`<security-risk-view></security-risk-view>`;case"warroom":return o`<warroom-view></warroom-view>`;case"messaging":return o`<messaging-view></messaging-view>`;case"ai-experts":return o`<ai-experts-view></ai-experts-view>`;case"skills-market":return o`<skills-market-view .roleId=${this.selectedRole} .installedSkills=${this.installedSkills} @skill-toggle=${this.handleSkillToggle}></skills-market-view>`;case"settings":return o`<settings-view></settings-view>`;default:return o`<dashboard-view></dashboard-view>`}}render(){return o`
      <aside>
        <div class="logo">
          <h1><span>🛡️</span> SecuClaw</h1>
          <div class="logo-subtitle">${p("app.subtitle")}</div>
          <div style="margin-top: 0.75rem;">
            <language-switcher></language-switcher>
          </div>
        </div>

        ${this.renderConnectionStatus()}

        <nav>
          ${this.renderNavItems()}
        </nav>

        ${this.renderRoleSelector()}
      </aside>

      <main>
        ${this.renderMainContent()}
      </main>
    `}};z.styles=x`
    :host {
      display: flex;
      width: 100vw;
      height: 100vh;
      background: #0f0f1a;
      color: #fff;
      font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    }

    aside {
      width: 260px;
      background: #1a1a2e;
      padding: 1rem;
      display: flex;
      flex-direction: column;
      border-right: 1px solid #2a2a4a;
    }

    .logo {
      margin-bottom: 1.5rem;
      padding-bottom: 1rem;
      border-bottom: 1px solid #2a2a4a;
    }

    .logo h1 {
      font-size: 1.25rem;
      margin: 0 0 0.25rem 0;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .logo-subtitle {
      font-size: 0.7rem;
      color: #666;
    }

    .connection-status {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.5rem 0.75rem;
      background: #0f0f1a;
      border-radius: 6px;
      margin-bottom: 1rem;
      font-size: 0.75rem;
      color: #888;
    }

    .connection-status.connected {
      color: #22c55e;
    }

    .connection-status.connecting {
      color: #f59e0b;
    }

    .connection-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #666;
    }

    .connection-dot.connected {
      background: #22c55e;
    }

    .connection-dot.connecting {
      background: #f59e0b;
      animation: pulse 1s infinite;
    }

    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.5; }
    }

    .connect-btn {
      padding: 0.25rem 0.5rem;
      font-size: 0.65rem;
      background: #3b82f6;
      border: none;
      border-radius: 4px;
      color: #fff;
      cursor: pointer;
    }

    .connect-btn:hover {
      background: #2563eb;
    }

    .connect-btn:disabled {
      background: #4a4a6a;
      cursor: not-allowed;
    }

    nav {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
      margin-bottom: 1.5rem;
    }

    .nav-item {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.75rem 1rem;
      border: none;
      border-radius: 8px;
      background: transparent;
      color: #a0a0b0;
      cursor: pointer;
      font-size: 0.9rem;
      text-align: left;
      transition: all 0.2s;
    }

    .nav-item:hover {
      background: #2a2a4a;
    }

    .nav-item.active {
      background: #4a4a6a;
    }

    .nav-group {
      margin-bottom: 0.5rem;
    }

    .nav-group-header {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.5rem 1rem;
      font-size: 0.7rem;
      color: #666;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      cursor: pointer;
      transition: color 0.2s;
    }

    .nav-group-header:hover {
      color: #888;
    }

    .nav-group-header .arrow {
      font-size: 0.6rem;
      transition: transform 0.2s;
    }

    .nav-group-header .arrow.collapsed {
      transform: rotate(-90deg);
    }

    .nav-group-items {
      display: flex;
      flex-direction: column;
      gap: 0.125rem;
    }

    .nav-group-items.collapsed {
      display: none;
    }

    .nav-icon {
      font-size: 1.1rem;
    }

    main {
      flex: 1;
      overflow: auto;
      background: #0f0f1a;
    }

    .role-selector {
      margin-bottom: 1rem;
    }

    .role-selector-title {
      font-size: 0.7rem;
      color: #666;
      margin-bottom: 0.5rem;
    }

    .role-item {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      width: 100%;
      padding: 0.5rem 0.75rem;
      margin-bottom: 0.25rem;
      border: none;
      border-radius: 6px;
      background: transparent;
      color: #fff;
      cursor: pointer;
      text-align: left;
      font-size: 0.8rem;
      transition: all 0.2s;
    }

    .role-item:hover {
      background: #2a2a4a;
    }

    .role-item.active {
      background: #4a4a6a;
    }

    .role-emoji {
      font-size: 1rem;
    }

    .role-name {
      flex: 1;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
  `;ae([m()],z.prototype,"currentPage",2);ae([m()],z.prototype,"selectedRole",2);ae([m()],z.prototype,"collapsedGroups",2);z=ae([y("app-layout")],z);var ii=Object.getOwnPropertyDescriptor,si=(t,e,i,s)=>{for(var r=s>1?void 0:s?ii(e,i):e,n=t.length-1,a;n>=0;n--)(a=t[n])&&(r=a(r)||r);return r};let we=class extends g{render(){return o`<app-layout></app-layout>`}};we.styles=x`
    :host {
      display: block;
      width: 100vw;
      height: 100vh;
      overflow: hidden;
      font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    }
  `;we=si([y("secuclaw-app")],we);
//# sourceMappingURL=index-Bxx0Xud5.js.map
