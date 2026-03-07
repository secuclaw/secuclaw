import { LitElement, html, css } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { SECURITY_ROLES, getRoleById, type SecurityRole, type SkillMetadata } from '../../config/roles';
import { loadSkillMetadata } from '../../services/skill-loader';

interface Task {
  id: string;
  title: string;
  description: string;
  sourceRole: string;
  targetRole: string;
  status: 'pending' | 'in-progress' | 'completed';
  priority: 'low' | 'medium' | 'high' | 'critical';
  createdAt: Date;
}

interface RoleCoordination {
  fromRole: string;
  toRole: string;
  taskCount: number;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  roleId?: string;
  capabilities?: Record<string, string[]>;
}

@customElement('ai-experts-view')
export class AIExpertsView extends LitElement {
  @state() private selectedRole: string = 'security-expert';
  @state() private viewMode: 'overview' | 'role-detail' | 'coordination' | 'chat' | 'config' = 'overview';
  @state() private tasks: Task[] = [];
  @state() private loadedSkills: Map<string, SkillMetadata> = new Map();
  @state() private loadingSkills = true;
  @state() private newTaskTitle = '';
  @state() private newTaskDesc = '';
  @state() private newTaskTarget = '';
  @state() private newTaskPriority: 'low' | 'medium' | 'high' | 'critical' = 'medium';
  @state() private chatMessages: ChatMessage[] = [];
  @state() private chatInput = '';
  @state() private isChatMode = false;
  @state() private currentChatRole = 'security-expert';
  @state() private activeRoleConfig = 'security-expert';
  @state() private showConfigPanel = false;

  static styles = css`
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
  `;

  async connectedCallback() {
    super.connectedCallback();
    for (const role of SECURITY_ROLES) {
      const metadata = await loadSkillMetadata(role.id);
      if (metadata) {
        this.loadedSkills = new Map(this.loadedSkills).set(role.id, metadata);
      }
    }
    this.loadingSkills = false;
  }

  private getRoleById(id: string): SecurityRole | undefined {
    return SECURITY_ROLES.find(r => r.id === id);
  }

  private getRoleSkill(roleId: string): SkillMetadata | undefined {
    return this.loadedSkills.get(roleId);
  }

  private getCoordinationStats(): RoleCoordination[] {
    const coordMap = new Map<string, number>();
    this.tasks.forEach(task => {
      const key = `${task.sourceRole}->${task.targetRole}`;
      coordMap.set(key, (coordMap.get(key) || 0) + 1);
    });
    return Array.from(coordMap.entries()).map(([key, count]) => {
      const [fromRole, toRole] = key.split('->');
      return { fromRole, toRole, taskCount: count };
    });
  }

  private handleCreateTask() {
    if (!this.newTaskTitle.trim() || !this.newTaskTarget) return;
    const newTask: Task = {
      id: `task-${Date.now()}`,
      title: this.newTaskTitle,
      description: this.newTaskDesc,
      sourceRole: this.selectedRole,
      targetRole: this.newTaskTarget,
      status: 'pending',
      priority: this.newTaskPriority,
      createdAt: new Date(),
    };
    this.tasks = [...this.tasks, newTask];
    this.newTaskTitle = '';
    this.newTaskDesc = '';
    this.newTaskTarget = '';
    this.newTaskPriority = 'medium';
  }

  private handleStatusChange(taskId: string, status: Task['status']) {
    this.tasks = this.tasks.map(t => t.id === taskId ? { ...t, status } : t);
  }

  // ===== Chat Methods =====
  private handleSendMessage() {
    if (!this.chatInput.trim()) return;
    
    const userMessage: ChatMessage = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content: this.chatInput,
      timestamp: new Date(),
      roleId: this.currentChatRole
    };
    
    this.chatMessages = [...this.chatMessages, userMessage];
    const input = this.chatInput;
    this.chatInput = '';
    
    // Generate response based on skills
    setTimeout(() => {
      const response = this.generateSkillBasedResponse(input);
      this.chatMessages = [...this.chatMessages, response];
    }, 300);
  }

  private generateSkillBasedResponse(input: string): ChatMessage {
    const role = this.getRoleById(this.currentChatRole);
    const skill = this.getRoleSkill(this.currentChatRole);
    const lowerInput = input.toLowerCase();
    
    // Check if user is asking about role identity
    if (lowerInput.includes('角色') || lowerInput.includes('是什么') || lowerInput.includes('谁') || lowerInput.includes('身份')) {
      return {
        id: `msg-${Date.now()}`,
        role: 'assistant',
        content: this.buildRoleIdentityResponse(role, skill),
        timestamp: new Date(),
        roleId: this.currentChatRole,
        capabilities: skill?.capabilities as Record<string, string[]> | undefined
      };
    }
    
    // Default: respond based on skills
    return {
      id: `msg-${Date.now()}`,
      role: 'assistant',
      content: this.buildSkillBasedResponse(input, skill),
      timestamp: new Date(),
      roleId: this.currentChatRole,
      capabilities: skill?.capabilities as Record<string, string[]> | undefined
    };
  }

  private buildRoleIdentityResponse(role: SecurityRole | undefined, skill: SkillMetadata | undefined): string {
    if (!role) return '未找到角色配置';
    
    const lines = [
      `${role.emoji} 我是 ${role.name}（${role.nameEn}）`,
      `${role.desc}`,
      '',
      `📂 技能配置文件: /skills/${role.skillFolder}/SKILL.md`,
      ''
    ];
    
    if (skill) {
      lines.push('🎯 我具备以下技能领域:');
      
      if (skill.capabilities.light.length > 0) {
        lines.push(`  🟢 防御能力 (${skill.capabilities.light.length}项): ${skill.capabilities.light.slice(0, 5).join('、')}${skill.capabilities.light.length > 5 ? '...' : ''}`);
      }
      if (skill.capabilities.dark.length > 0) {
        lines.push(`  🔴 攻击/测试能力 (${skill.capabilities.dark.length}项): ${skill.capabilities.dark.slice(0, 5).join('、')}${skill.capabilities.dark.length > 5 ? '...' : ''}`);
      }
      if (skill.capabilities.security.length > 0) {
        lines.push(`  🔵 安全分析能力 (${skill.capabilities.security.length}项): ${skill.capabilities.security.slice(0, 5).join('、')}${skill.capabilities.security.length > 5 ? '...' : ''}`);
      }
      if (skill.capabilities.legal.length > 0) {
        lines.push(`  🟣 合规法律能力 (${skill.capabilities.legal.length}项): ${skill.capabilities.legal.slice(0, 5).join('、')}${skill.capabilities.legal.length > 5 ? '...' : ''}`);
      }
      if (skill.capabilities.technology.length > 0) {
        lines.push(`  🟠 技术能力 (${skill.capabilities.technology.length}项): ${skill.capabilities.technology.slice(0, 5).join('、')}${skill.capabilities.technology.length > 5 ? '...' : ''}`);
      }
      if (skill.capabilities.business.length > 0) {
        lines.push(`  🩷 业务能力 (${skill.capabilities.business.length}项): ${skill.capabilities.business.slice(0, 5).join('、')}${skill.capabilities.business.length > 5 ? '...' : ''}`);
      }
      
      if (skill.mitre_coverage.length > 0) {
        lines.push('');
        lines.push(`🛡️ MITRE ATT&CK 覆盖: ${skill.mitre_coverage.slice(0, 5).join('、')}...`);
      }
      if (skill.scf_coverage.length > 0) {
        lines.push(`📋 SCF框架覆盖: ${skill.scf_coverage.slice(0, 5).join('、')}...`);
      }
    }
    
    lines.push('');
    lines.push(`💡 当前激活角色: ${this.currentChatRole}`);
    lines.push(`🔄 技能来源: 读取自 ai_secuclaw/secuclaw/skills/${role.skillFolder}/SKILL.md`);
    
    return lines.join('\n');
  }

  private buildSkillBasedResponse(input: string, skill: SkillMetadata | undefined): string {
    if (!skill) return '技能配置加载中，请稍候...';
    
    const role = this.getRoleById(this.currentChatRole);
    
    let response = `${role?.emoji} ${role?.name} 响应:\n\n`;
    
    const categories: { key: keyof typeof skill.capabilities; label: string; emoji: string }[] = [
      { key: 'light', label: '防御能力', emoji: '🟢' },
      { key: 'dark', label: '攻击/测试能力', emoji: '🔴' },
      { key: 'security', label: '安全分析能力', emoji: '🔵' },
      { key: 'legal', label: '合规法律能力', emoji: '🟣' },
      { key: 'technology', label: '技术能力', emoji: '🟠' },
      { key: 'business', label: '业务能力', emoji: '🩷' }
    ];
    
    for (const cat of categories) {
      const caps = skill.capabilities[cat.key];
      if (caps.length > 0) {
        response += `${cat.emoji} ${cat.label}: ${caps.join('、')}\n`;
      }
    }
    
    response += `\n📂 技能配置来源: ai_secuclaw/secuclaw/skills/${role?.skillFolder}/SKILL.md`;
    
    return response;
  }

  private switchChatRole(roleId: string) {
    this.currentChatRole = roleId;
    this.activeRoleConfig = roleId;
    const role = this.getRoleById(roleId);
    const skill = this.getRoleSkill(roleId);
    const welcomeMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      role: 'assistant',
      content: `已切换到 ${role?.emoji} ${role?.name}，技能配置已更新为 /skills/${role?.skillFolder}/SKILL.md`,
      timestamp: new Date(),
      roleId,
      capabilities: skill?.capabilities as Record<string, string[]> | undefined
    };
    this.chatMessages = [...this.chatMessages, welcomeMsg];
  }

  private renderCapabilitySection(capabilities: Record<string, string[]> | undefined) {
    if (!capabilities) return '';
    
    const categories = [
      { key: 'light', label: '🟢 防御能力', emoji: '🟢' },
      { key: 'dark', label: '🔴 攻击能力', emoji: '🔴' },
      { key: 'security', label: '🔵 安全能力', emoji: '🔵' },
      { key: 'legal', label: '🟣 合规能力', emoji: '🟣' },
      { key: 'technology', label: '🟠 技术能力', emoji: '🟠' },
      { key: 'business', label: '🩷 业务能力', emoji: '🩷' }
    ];
    
    return html`
      <div class="capability-section">
        ${categories.map(cat => {
          const caps = capabilities[cat.key];
          if (!caps || caps.length === 0) return '';
          return html`
            <div class="capability-type ${cat.key}">${cat.label}</div>
            <div class="capability-list">
              ${caps.map(c => html`<span class="capability-item">${c}</span>`)}
            </div>
          `;
        })}
      </div>
    `;
  }

  private renderChatMode() {
    return html`
      <div class="chat-container">
        <div class="role-selector">
          ${SECURITY_ROLES.map(role => html`
            <button 
              class="role-chip ${this.currentChatRole === role.id ? 'active' : ''}"
              @click=${() => this.switchChatRole(role.id)}
            >
              ${role.emoji} ${role.name}
            </button>
          `)}
        </div>
        
        <div class="chat-messages">
          ${this.chatMessages.length === 0 ? html`
            <div class="empty-state">
              <div style="font-size: 2rem; margin-bottom: 0.5rem;">🤖</div>
              <div>选择上方角色，然后输入问题</div>
              <div style="font-size: 0.8rem; margin-top: 0.5rem; color: #666;">试试问: "你的角色是什么"</div>
            </div>
          ` : this.chatMessages.map(msg => html`
            <div class="chat-message ${msg.role}">
              <div class="msg-role">${msg.role === 'user' ? '你' : this.getRoleById(msg.roleId || '')?.name || 'AI'}</div>
              <div class="msg-content">${msg.content}</div>
              ${msg.capabilities ? this.renderCapabilitySection(msg.capabilities) : ''}
            </div>
          `)}
        </div>
        
        <div class="chat-input-container">
          <input 
            type="text" 
            class="chat-input" 
            placeholder="输入问题... (试试: 你的角色是什么)"
            .value=${this.chatInput}
            @input=${(e: Event) => this.chatInput = (e.target as HTMLInputElement).value}
            @keydown=${(e: KeyboardEvent) => e.key === 'Enter' && this.handleSendMessage()}
          />
          <button class="chat-send-btn" @click=${this.handleSendMessage}>发送</button>
        </div>
      </div>
    `;
  }

  private renderConfigPanel() {
    return html`
      <div class="config-panel">
        <div class="config-title">⚙️ 角色配置管理</div>
        <div class="config-grid">
          ${SECURITY_ROLES.map(role => html`
            <div 
              class="config-item ${this.activeRoleConfig === role.id ? 'active' : ''}"
              @click=${() => { this.activeRoleConfig = role.id; this.currentChatRole = role.id; }}
            >
              <div class="config-item-icon">${role.emoji}</div>
              <div class="config-item-name">${role.name}</div>
              <div class="config-item-path">/skills/${role.skillFolder}/SKILL.md</div>
            </div>
          `)}
        </div>
      </div>
    `;
  }

  private renderCapabilityGroup(label: string, capabilities: string[], type: string) {
    return html`
      <div class="capability-group">
        <div class="capability-label">${label} ${capabilities.length > 0 ? `(${capabilities.length})` : '(0)'}</div>
        <div class="capability-grid">
          ${capabilities.length > 0 ? capabilities.map(cap => html`<span class="capability-tag ${type}">${cap}</span>`) : html`<span class="capability-tag" style="opacity: 0.5;">暂无配置</span>`}
        </div>
      </div>
    `;
  }

  render() {
    if (this.loadingSkills) {
      return html`<div class="loading">加载技能配置中...</div>`;
    }

    return html`
      <header>
        <h1>🤖 AI安全专家配置</h1>
        <div class="view-toggle">
          <button class="toggle-btn ${this.viewMode === 'overview' ? 'active' : ''}" @click=${() => this.viewMode = 'overview'}>👥 角色总览</button>
          <button class="toggle-btn ${this.viewMode === 'role-detail' ? 'active' : ''}" @click=${() => this.viewMode = 'role-detail'}>🔍 角色详情</button>
          <button class="toggle-btn ${this.viewMode === 'chat' ? 'active' : ''}" @click=${() => this.viewMode = 'chat'}>💬 角色问答</button>
          <button class="toggle-btn ${this.viewMode === 'config' ? 'active' : ''}" @click=${() => this.viewMode = 'config'}>⚙️ 配置管理</button>
          <button class="toggle-btn ${this.viewMode === 'coordination' ? 'active' : ''}" @click=${() => this.viewMode = 'coordination'}>🔗 任务协调</button>
        </div>
      </header>
      <div class="content">
        ${this.viewMode === 'overview' ? this.renderOverview() : ''}
        ${this.viewMode === 'role-detail' ? this.renderRoleDetail() : ''}
        ${this.viewMode === 'chat' ? this.renderChatMode() : ''}
        ${this.viewMode === 'config' ? this.renderConfigPanel() : ''}
        ${this.viewMode === 'coordination' ? this.renderCoordination() : ''}
      </div>
    `;
  }

  private renderOverview() {
    return html`
      <div class="roles-grid">
        ${SECURITY_ROLES.map(role => {
          const skill = this.getRoleSkill(role.id);
          const roleTasks = this.tasks.filter(t => t.sourceRole === role.id || t.targetRole === role.id);
          const assigned = roleTasks.filter(t => t.targetRole === role.id && t.status !== 'completed').length;
          const coordinated = roleTasks.filter(t => t.sourceRole === role.id).length;
          const totalCaps = skill 
            ? skill.capabilities.light.length + skill.capabilities.dark.length + skill.capabilities.security.length + skill.capabilities.legal.length + skill.capabilities.technology.length + skill.capabilities.business.length
            : 0;
          
          return html`
            <div class="role-card ${this.selectedRole === role.id ? 'selected' : ''}" @click=${() => { this.selectedRole = role.id; this.viewMode = 'role-detail'; }}>
              <div class="role-header">
                <div class="role-icon" style="background: ${role.color}20">${role.emoji}</div>
                <div class="role-info">
                  <h3>${role.name}</h3>
                  <div class="name-en">${role.nameEn}</div>
                </div>
              </div>
              <div class="role-desc">${role.desc}</div>
              <div class="skills-list">
                ${skill ? html`
                  <span class="skill-tag" style="color: #22c55e">🟢 ${skill.capabilities.light.length}</span>
                  <span class="skill-tag" style="color: #ef4444">🔴 ${skill.capabilities.dark.length}</span>
                  <span class="skill-tag" style="color: #3b82f6">🔵 ${skill.capabilities.security.length}</span>
                  <span class="skill-tag" style="color: #8b5cf6">🟣 ${skill.capabilities.legal.length}</span>
                  <span class="skill-tag" style="color: #f59e0b">🟠 ${skill.capabilities.technology.length}</span>
                  <span class="skill-tag" style="color: #ec4899">🩷 ${skill.capabilities.business.length}</span>
                ` : html`<span class="skill-tag">加载中...</span>`}
              </div>
              <div class="domain-tags">${role.domains.map(d => html`<span class="domain-tag">${d}</span>`)}</div>
              <div class="role-stats">
                <div class="stat"><div class="stat-value">${assigned}</div><div class="stat-label">待处理</div></div>
                <div class="stat"><div class="stat-value">${coordinated}</div><div class="stat-label">协调</div></div>
                <div class="stat"><div class="stat-value">${totalCaps}</div><div class="stat-label">技能总数</div></div>
              </div>
            </div>
          `;
        })}
      </div>
    `;
  }

  private renderRoleDetail() {
    const role = this.getRoleById(this.selectedRole);
    if (!role) return html`<div class="empty-state">请选择角色</div>`;

    const skill = this.getRoleSkill(role.id);
    const roleTasks = this.tasks.filter(t => t.sourceRole === role.id || t.targetRole === role.id);

    return html`
      <div class="detail-header">
        <button class="back-btn" @click=${() => this.viewMode = 'overview'}>←</button>
        <div class="detail-icon" style="background: ${role.color}20">${role.emoji}</div>
        <div class="detail-info">
          <h2>${role.name} <span style="color: #888; font-weight: normal;">${role.nameEn}</span></h2>
          <p>${role.desc}</p>
        </div>
      </div>

      ${skill ? html`
        <div class="detail-section">
          <div class="section-title">${skill.emoji} ${skill.name} - 技能配置</div>
          <p style="color: #888; font-size: 0.85rem; margin-bottom: 1rem;">${skill.description}</p>
          
          ${this.renderCapabilityGroup('🟢 防御能力 (Light)', skill.capabilities.light, 'light')}
          ${this.renderCapabilityGroup('🔴 攻击能力 (Dark)', skill.capabilities.dark, 'dark')}
          ${this.renderCapabilityGroup('🔵 安全能力 (Security)', skill.capabilities.security, 'security')}
          ${this.renderCapabilityGroup('🟣 法律合规 (Legal)', skill.capabilities.legal, 'legal')}
          ${this.renderCapabilityGroup('🟠 技术能力 (Technology)', skill.capabilities.technology, 'technology')}
          ${this.renderCapabilityGroup('🩷 业务能力 (Business)', skill.capabilities.business, 'business')}

          <div class="coverage-section">
            <div class="coverage-title">MITRE ATT&CK 覆盖: ${skill.mitre_coverage.length} 项</div>
            <div class="coverage-tags">
              ${skill.mitre_coverage.slice(0, 10).map(c => html`<span class="coverage-tag">${c}</span>`)}
              ${skill.mitre_coverage.length > 10 ? html`<span class="coverage-tag">+${skill.mitre_coverage.length - 10}</span>` : ''}
            </div>
          </div>

          <div class="coverage-section">
            <div class="coverage-title">SCF 控制框架覆盖: ${skill.scf_coverage.length} 项</div>
            <div class="coverage-tags">
              ${skill.scf_coverage.slice(0, 10).map(c => html`<span class="coverage-tag">${c}</span>`)}
              ${skill.scf_coverage.length > 10 ? html`<span class="coverage-tag">+${skill.scf_coverage.length - 10}</span>` : ''}
            </div>
          </div>
        </div>
      ` : html`<div class="detail-section"><div class="empty-state">无法加载技能配置</div></div>`}

      <div class="detail-section">
        <div class="section-title">📋 相关任务</div>
        ${roleTasks.length === 0 ? html`<div class="empty-state">暂无任务</div>` : html`
          <div class="task-list">
            ${roleTasks.map(task => html`
              <div class="task-item">
                <div class="task-header">
                  <span class="task-title">${task.title}</span>
                  <span class="priority-badge ${task.priority}">${task.priority}</span>
                </div>
                <div class="task-desc">${task.description}</div>
                <div class="task-footer">
                  <span>${task.sourceRole === role.id ? '→ 分配给' : '← 来自'}: ${task.sourceRole === role.id ? this.getRoleById(task.targetRole)?.name : this.getRoleById(task.sourceRole)?.name}</span>
                  <select class="task-status ${task.status}" style="background: transparent; border: none; color: inherit;" .value=${task.status} @change=${(e: Event) => this.handleStatusChange(task.id, (e.target as HTMLSelectElement).value as Task['status'])}>
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
    `;
  }

  private renderCoordination() {
    const coordStats = this.getCoordinationStats();

    return html`
      <div class="coordination-grid">
        <div class="task-panel">
          <h3>📤 分配任务</h3>
          <div class="task-form">
            <input type="text" placeholder="任务标题" .value=${this.newTaskTitle} @input=${(e: Event) => this.newTaskTitle = (e.target as HTMLInputElement).value} />
            <textarea placeholder="任务描述" .value=${this.newTaskDesc} @input=${(e: Event) => this.newTaskDesc = (e.target as HTMLTextAreaElement).value}></textarea>
            <select .value=${this.newTaskTarget} @change=${(e: Event) => this.newTaskTarget = (e.target as HTMLSelectElement).value}>
              <option value="">选择目标角色</option>
              ${SECURITY_ROLES.filter(r => r.id !== this.selectedRole).map(r => html`<option value=${r.id}>${r.emoji} ${r.name}</option>`)}
            </select>
            <select .value=${this.newTaskPriority} @change=${(e: Event) => this.newTaskPriority = (e.target as HTMLSelectElement).value as Task['priority']}>
              <option value="low">低优先级</option>
              <option value="medium">中优先级</option>
              <option value="high">高优先级</option>
              <option value="critical">紧急</option>
            </select>
            <button class="submit-btn" @click=${this.handleCreateTask}>创建任务</button>
          </div>

          <div class="task-list">
            ${this.tasks.filter(t => t.sourceRole === this.selectedRole).map(task => html`
              <div class="task-item">
                <div class="task-header">
                  <span class="task-title">${task.title}</span>
                  <span class="priority-badge ${task.priority}">${task.priority}</span>
                </div>
                <div class="task-desc">${task.description}</div>
                <div class="task-footer">
                  <span>→ ${this.getRoleById(task.targetRole)?.name}</span>
                  <span class="task-status ${task.status}">${task.status === 'pending' ? '待处理' : task.status === 'in-progress' ? '进行中' : '已完成'}</span>
                </div>
              </div>
            `)}
            ${this.tasks.filter(t => t.sourceRole === this.selectedRole).length === 0 ? html`<div class="empty-state">暂无分配的任务</div>` : ''}
          </div>
        </div>

        <div class="coordination-stats">
          <h3 class="section-title">📊 协调统计</h3>
          ${coordStats.length === 0 ? html`<div class="empty-state">暂无协调数据</div>` : html`
            ${coordStats.map(coord => html`
              <div class="coordination-item">
                <div class="coordination-roles">
                  <span>${this.getRoleById(coord.fromRole)?.emoji}</span>
                  <span>${this.getRoleById(coord.fromRole)?.name}</span>
                  <span class="coordination-arrow">→</span>
                  <span>${this.getRoleById(coord.toRole)?.emoji}</span>
                  <span>${this.getRoleById(coord.toRole)?.name}</span>
                </div>
                <span class="coordination-count">${coord.taskCount} 任务</span>
              </div>
            `)}
          `}
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'ai-experts-view': AIExpertsView;
  }
}
