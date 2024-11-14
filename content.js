class PromptBox {
  constructor() {
    this.prompts = {
      global: [],
      local: []
    };
    this.activeTab = 'local';
    this.isExpanded = false;
    this.position = { x: window.innerWidth - 300, y: 12 };
    this.togglePosition = { x: window.innerWidth - 200, y: 8 };
    this.createContainers();
    this.loadState().then(() => {
      this.render();
      this.setupToggleShortcut();
    });
    this.editingId = null;
  }

  createContainers() {
    this.toggleButton = document.createElement('div');
    this.toggleButton.className = 'prompt-toggle-btn';
    this.toggleButton.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
      </svg>
    `;
    document.body.appendChild(this.toggleButton);

    this.container = document.createElement('div');
    this.container.className = 'ai-prompt-box hidden';
    document.body.appendChild(this.container);

    this.updateTogglePosition();

    this.toggleButton.addEventListener('click', () => this.toggleExpand());
  }

  async loadState() {
    try {
      const data = await chrome.storage.sync.get(['prompts', 'position', 'togglePosition', 'isExpanded', 'activeTab']);
      if (data.prompts) {
        this.prompts = data.prompts;
      }
      if (data.position) {
        this.position = data.position;
      }
      if (data.togglePosition) {
        this.togglePosition = data.togglePosition;
      }
      if (data.activeTab) {
        this.activeTab = data.activeTab;
      }
      if (data.isExpanded) {
        this.isExpanded = data.isExpanded;
        this.toggleExpand();
      }
      this.updatePositions();
    } catch (error) {
      console.error('Error loading state:', error);
    }
  }

  updatePositions() {
    this.updateTogglePosition();
    
    if (this.isExpanded) {
      this.container.style.left = `${this.position.x}px`;
      this.container.style.top = `${this.position.y}px`;
    }
  }

  updateTogglePosition() {
    this.toggleButton.style.left = `${this.togglePosition.x}px`;
    this.toggleButton.style.top = `${this.togglePosition.y}px`;
  }

  async saveState() {
    try {
      await chrome.storage.sync.set({
        prompts: this.prompts,
        position: this.position,
        togglePosition: this.togglePosition,
        isExpanded: this.isExpanded,
        activeTab: this.activeTab
      });
    } catch (error) {
      console.error('Error saving state:', error);
    }
  }

  toggleExpand() {
    this.isExpanded = !this.isExpanded;
    if (this.isExpanded) {
      this.container.style.left = `${this.position.x}px`;
      this.container.style.top = `${this.position.y}px`;
      this.container.classList.remove('hidden');
    } else {
      this.container.classList.add('hidden');
    }
    this.saveState();
  }

  setupToggleShortcut() {
    document.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'p') {
        e.preventDefault();
        this.toggleExpand();
      }
    });
  }

  setupDragging() {
    const handle = this.container.querySelector('.drag-handle');
    let isDragging = false;
    let startX, startY, startPosX, startPosY;

    const handleMouseDown = (e) => {
      if (e.target.closest('.minimize-btn')) return;
      isDragging = true;
      startX = e.clientX;
      startY = e.clientY;
      startPosX = this.position.x;
      startPosY = this.position.y;
    };

    const handleMouseMove = (e) => {
      if (!isDragging) return;
      
      const deltaX = e.clientX - startX;
      const deltaY = e.clientY - startY;
      
      this.position = {
        x: Math.min(Math.max(startPosX + deltaX, 50), window.innerWidth - 50),
        y: Math.max(startPosY + deltaY, 20)
      };
      
      this.updatePositions();
    };

    const handleMouseUp = () => {
      if (isDragging) {
        isDragging = false;
        this.saveState();
      }
    };

    handle.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }

  async addPrompt(text, type = 'local') {
    if (!text.trim()) return;
    
    const newPrompt = {
      id: `${type[0]}${Date.now()}`,
      text: text.trim(),
      type
    };
    
    this.prompts[type].push(newPrompt);
    await this.saveState();
    this.render();
  }

  async deletePrompt(id) {
    const type = id.startsWith('g') ? 'global' : 'local';
    if (type === 'global') {
      return;
    }
    
    const confirmed = confirm('Are you sure you want to delete this prompt?');
    if (!confirmed) return;
    
    this.prompts[type] = this.prompts[type].filter(prompt => prompt.id !== id);
    await this.saveState();
    this.render();
  }

  async copyPrompt(id) {
    const type = id.startsWith('g') ? 'global' : 'local';
    const prompt = this.prompts[type].find(p => p.id === id);
    if (prompt) {
      try {
        await navigator.clipboard.writeText(prompt.text);
        const copyBtn = this.container.querySelector(`.copy-btn[data-id="${id}"]`);
        if (copyBtn) {
          const originalHTML = copyBtn.innerHTML;
          copyBtn.innerHTML = '✓';
          setTimeout(() => {
            copyBtn.innerHTML = originalHTML;
          }, 1000);
        }
      } catch (err) {
        console.error('Failed to copy text:', err);
      }
    }
  }

  async switchTab(tab) {
    this.activeTab = tab;
    await this.saveState();
    this.render();
  }

  render() {
    const currentPrompts = this.prompts[this.activeTab];
    
    this.container.innerHTML = `
      <div class="drag-handle">
        <span>PromptBox</span>
        <div class="handle-actions">
          <button class="minimize-btn" title="Minimize">−</button>
          <div class="handle-icon">⋮⋮</div>
        </div>
      </div>
      
      <div class="prompt-content">
        <div class="tabs">
          <button class="tab-btn ${this.activeTab === 'global' ? 'active' : ''}" data-tab="global">
            Global
          </button>
          <button class="tab-btn ${this.activeTab === 'local' ? 'active' : ''}" data-tab="local">
            Local
          </button>
        </div>
        
        ${this.activeTab === 'local' ? `
          <div class="add-prompt">
            <input type="text" placeholder="Add new local prompt..." id="new-prompt-input">
            <button id="add-prompt-btn" class="action-btn add">+</button>
          </div>
        ` : ''}
        
        <div class="prompts-list">
          ${currentPrompts.map((prompt, index) => `
            <div class="prompt-item">
              <div class="prompt-header">
                <span class="prompt-number">${index + 1}</span>
                <button class="copy-btn action-btn" data-id="${prompt.id}" title="Copy">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                  </svg>
                </button>
              </div>
              <p class="prompt-text" title="${prompt.text}">${this.truncateText(prompt.text)}</p>
              ${prompt.type === 'local' ? `
                <div class="prompt-actions">
                  <button class="delete-btn action-btn" data-id="${prompt.id}" title="Delete">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M3 6h18"></path>
                      <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
                      <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
                    </svg>
                  </button>
                </div>
              ` : ''}
            </div>
          `).join('')}
        </div>
      </div>
    `;

    this.setupEventListeners();
    this.setupDragging();
  }

  truncateText(text, wordLimit = 10) {
    const words = text.split(' ');
    if (words.length > wordLimit) {
      return words.slice(0, wordLimit).join(' ') + '...';
    }
    return text;
  }

  setupEventListeners() {
    const minimizeBtn = this.container.querySelector('.minimize-btn');
    if (minimizeBtn) {
      minimizeBtn.addEventListener('click', () => this.toggleExpand());
    }

    const tabBtns = this.container.querySelectorAll('.tab-btn');
    tabBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        this.switchTab(btn.dataset.tab);
      });
    });

    const addInput = this.container.querySelector('#new-prompt-input');
    const addButton = this.container.querySelector('#add-prompt-btn');
    if (addInput && addButton) {
      addInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          this.addPrompt(addInput.value);
          addInput.value = '';
        }
      });

      addButton.addEventListener('click', () => {
        this.addPrompt(addInput.value);
        addInput.value = '';
      });
    }

    this.container.querySelectorAll('.copy-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this.copyPrompt(btn.dataset.id);
      });
    });

    this.container.querySelectorAll('.delete-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this.deletePrompt(btn.dataset.id);
      });
    });
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => new PromptBox());
} else {
  new PromptBox();
}