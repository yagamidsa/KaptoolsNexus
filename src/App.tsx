// src/App.tsx - VERSIÓN FINAL LIMPIA

import { useState, useEffect } from "react";
import HolographicButton from "./components/HolographicButton";
import FuturisticBackground from "./components/FuturisticBackground";
import NeonDock from "./components/NeonDock";
import ReviewBranches from "./components/ReviewBranches";
import DownloadFiles from "./components/DownloadFiles";
import ProductData from './components/ProductData';
import DuplicateMDD from './components/DuplicateMDD';
import CreateStructure from './components/CreateStructure';
import ShortcutsNexus from './components/ShorcutsNexus';
import { SmartTooltipWrapper } from './components/SmartTooltipWrapper';
import './components/style/SmartTooltip.css';
import QChunksProcessor from './components/QChunksProcessor';
import SplashScreen from './components/SplashScreen';
import { open } from '@tauri-apps/plugin-dialog';
import "./App.css";

interface MenuItem {
  id: string;
  label: string;
  desc: string;
  icon: string;
  category: string;
  requiresWorkspace?: boolean;
  requiresMicroservices?: boolean;
}

interface WorkspaceValidation {
  valid: boolean;
  has_microservices: boolean;
  existing_repos: string[];
  workspace_path: string;
}

function App() {
  // 🔥 ESTADO DEL SPLASH SCREEN
  const [isAppLoading, setIsAppLoading] = useState(true);

  const [response, setResponse] = useState("");
  const [loading, setLoading] = useState(false);
  const [selectedItem, setSelectedItem] = useState<string>('');
  const [workspacePath, setWorkspacePath] = useState<string>('');
  const [activeView, setActiveView] = useState<'main' | 'review-branches'>('main');

  // Estados de modales
  const [showDownloadModal, setShowDownloadModal] = useState(false);
  const [showProductDataModal, setShowProductDataModal] = useState(false);
  const [showDuplicateMDDModal, setShowDuplicateMDDModal] = useState(false);
  const [showCreateStructureModal, setShowCreateStructureModal] = useState(false);
  const [showShortcutsModal, setShowShortcutsModal] = useState(false);
  const [showQChunksModal, setShowQChunksModal] = useState(false);
  const [showCopilotModal, setShowCopilotModal] = useState(false);

  // Estado de validación del workspace
  const [workspaceValidation, setWorkspaceValidation] = useState<WorkspaceValidation>({
    valid: false,
    has_microservices: false,
    existing_repos: [],
    workspace_path: ''
  });

  const menuItems: MenuItem[] = [
    // Git Operations
    {
      id: 'clone-master',
      label: 'Clone Repos (Master)',
      desc: 'Deploy microservices master',
      icon: '🏗️',
      category: 'GIT OPERATIONS',
      requiresWorkspace: true
    },
    {
      id: 'review-branches',
      label: 'Review Branches',
      desc: 'Analyze git branches',
      icon: '🔄',
      category: 'GIT OPERATIONS',
      requiresWorkspace: true,
      requiresMicroservices: true
    },

    // Azure Tools
    {
      id: 'azure-download',
      label: 'Download Files',
      desc: 'BEE, CeV and Link',
      icon: '☁️',
      category: 'AZURE TOOLS',
      requiresWorkspace: true
    },
    {
      id: 'product-data',
      label: 'Product Data',
      desc: 'Review products',
      icon: '📦',
      category: 'AZURE TOOLS'
    },

    // Data Processing
    {
      id: 'duplicate-mdd',
      label: 'Duplicate MDD',
      desc: 'Duplicate base files',
      icon: '📋',
      category: 'DATA PROCESSING',
      requiresWorkspace: true
    },
    {
      id: 'create-structure',
      label: 'Create Structure',
      desc: 'Project scaffolding',
      icon: '🏗️',
      category: 'DATA PROCESSING',
      requiresWorkspace: true,
      requiresMicroservices: true
    },

    // Utilities
    {
      id: 'kapchat',
      label: 'KapChat',
      desc: 'AI Support',
      icon: '🤖',
      category: 'UTILITIES'
    },
    {
      id: 'jsonpath',
      label: 'JsonPath Tool',
      desc: 'JSON query tool',
      icon: '🔧',
      category: 'UTILITIES'
    },
    {
      id: 'q-chunks-processor',
      label: 'ODIN Chunks Processor',
      desc: 'Process .odin files and generate chunks',
      icon: '⚙️',
      category: 'UTILITIES',
      requiresWorkspace: true
    },
    {
      id: 'shortcuts',
      label: 'Quantum Shortcuts',
      desc: 'Divine portal matrix',
      icon: '🌐',
      category: 'UTILITIES'
    }
  ];

  const categories = [...new Set(menuItems.map(item => item.category))];

  // Verificar si hay workspace seleccionado
  const isWorkspaceSelected = workspacePath !== '';

  // 🔥 HANDLER PARA CUANDO TERMINE EL SPLASH
  const handleSplashComplete = () => {
    console.log("✅ Splash screen completed!");
    setIsAppLoading(false);
    setResponse("🚀 KapTools Nexus successfully loaded!\n✨ All quantum systems online and ready");
  };

  // Función helper para tooltips dinámicos
  const getTooltipContent = (item: MenuItem, enabled: boolean) => {
    if (enabled) {
      return {
        icon: '✅',
        message: `Ready to execute`,
        detail: `${item.desc}`,
        type: 'success' as const
      };
    }

    if (item.requiresWorkspace && !isWorkspaceSelected) {
      return {
        icon: '📁',
        message: `Requires workspace selection`,
        detail: 'Select workspace folder first',
        type: 'warning' as const
      };
    }

    if (item.requiresMicroservices && !workspaceValidation.has_microservices) {
      return {
        icon: '🌿',
        message: `Requires microservices`,
        detail: 'Clone microservices first',
        type: 'error' as const
      };
    }

    return {
      icon: 'ℹ️',
      message: `${item.desc}`,
      detail: 'Click to execute',
      type: 'info' as const
    };
  };

  // Validar workspace cuando cambie
  useEffect(() => {
    if (isWorkspaceSelected) {
      validateWorkspace();
    } else {
      setWorkspaceValidation({
        valid: false,
        has_microservices: false,
        existing_repos: [],
        workspace_path: ''
      });
    }
  }, [workspacePath]);

  // Validar workspace con el backend
  const validateWorkspace = async () => {
    if (!isWorkspaceSelected) return;

    try {
      const res = await fetch(`http://127.0.0.1:8000/git/validate-workspace?workspace_path=${encodeURIComponent(workspacePath)}`);

      if (res.ok) {
        const data = await res.json();
        setWorkspaceValidation(data);

        if (data.has_microservices) {
          setResponse(`✅ Workspace validated!\n📂 ${workspacePath}\n🌿 Found repositories: ${data.existing_repos.join(', ')}`);
        } else {
          setResponse(`📂 Workspace ready: ${workspacePath}\n⚠️ No microservices found - clone them first`);
        }
      } else {
        setResponse(`❌ Could not validate workspace - Backend not available`);
      }
    } catch (error) {
      setResponse(`❌ Backend connection failed\n💡 Make sure to start the backend first`);
      setWorkspaceValidation({
        valid: false,
        has_microservices: false,
        existing_repos: [],
        workspace_path: workspacePath
      });
    }
  };

  const testAPI = async () => {
    try {
      const res = await fetch("http://127.0.0.1:8000/");
      const data = await res.json();
      setResponse(`🚀 ${data.message}\n🎯 Backend is running correctly!`);
    } catch (error) {
      setResponse("❌ Error connecting to API\n💡 Start backend with: cd backend && python main.py");
    }
  };

  const selectWorkspaceFolder = async () => {
    try {
      setResponse("🔍 Opening folder selector...");

      const { invoke } = await import('@tauri-apps/api/core');
      const selectedPath = await invoke('select_folder') as string | null;

      if (selectedPath && selectedPath.trim() !== '') {
        setWorkspacePath(selectedPath);
        setResponse(`📁 Workspace folder selected:\n📁 ${selectedPath}\n🔄 Validating...`);
        console.log('Selected workspace:', selectedPath);
      } else {
        setResponse("❌ No folder selected - User cancelled");
      }
    } catch (error) {
      console.error('Error opening folder selector:', error);
      setResponse(`❌ Folder selector error: ${error}`);
    }
  };

  const openWorkspaceFolder = async () => {
    if (!isWorkspaceSelected) {
      setResponse('❌ Must select workspace first');
      return;
    }

    try {
      setResponse("📂 Opening workspace folder...");

      const { invoke } = await import('@tauri-apps/api/core');
      const result = await invoke('open_folder', { path: workspacePath }) as string;

      setResponse(`✅ ${result}\n📂 Workspace opened in File Explorer`);
    } catch (error) {
      setResponse(`❌ Error opening folder: ${error}`);
    }
  };

  const cloneMicroservices = async (branch: string = "develop") => {
    if (!isWorkspaceSelected) {
      setResponse('❌ Must select workspace first');
      return;
    }

    setLoading(true);
    setResponse("⚡ Initializing quantum git protocols...");

    try {
      const res = await fetch("http://127.0.0.1:8000/git/clone-microservices", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          project_path: workspacePath,
          branch: branch
        }),
      });

      const data = await res.json();

      if (res.ok) {
        setResponse(`✅ ${data.message}\n📂 Workspace: ${data.workspace}\n🌿 Branch: ${data.branch}`);
        setTimeout(() => validateWorkspace(), 1000);
      } else {
        setResponse(`❌ Error: ${data.detail}`);
      }
    } catch (error) {
      setResponse("❌ Quantum connection failed - Backend not available");
    } finally {
      setLoading(false);
    }
  };

  // Verificar si item está habilitado
  const isMenuItemEnabled = (item: MenuItem): boolean => {
    if (item.requiresWorkspace && !isWorkspaceSelected) {
      return false;
    }

    if (item.requiresMicroservices && !workspaceValidation.has_microservices) {
      return false;
    }

    return true;
  };

  // Obtener mensaje de estado del item
  const getMenuItemStatusMessage = (item: MenuItem): string => {
    if (item.requiresWorkspace && !isWorkspaceSelected) {
      return "❌ Requires workspace selection";
    }

    if (item.requiresMicroservices && !workspaceValidation.has_microservices) {
      return "⚠️ Requires microservices (clone them first)";
    }

    return "✅ Ready";
  };

  // Handlers para cerrar modales
  const handleCloseReviewBranches = () => {
    setActiveView('main');
    setSelectedItem('');
    setResponse('📊 Returned to main dashboard');
  };

  const handleCloseDownloadModal = () => {
    setShowDownloadModal(false);
    setSelectedItem('');
    setResponse('☁️ Azure Download Center closed');
  };

  const handleCloseDuplicateMDDModal = () => {
    setShowDuplicateMDDModal(false);
    setSelectedItem('');
    setResponse('📋 MDD Duplicator closed');
  };

  const handleCloseCreateStructureModal = () => {
    setShowCreateStructureModal(false);
    setSelectedItem('');
    setResponse('🏗️ Project Structure Creator closed');
  };

  // Handler principal del menú
  const handleMenuItemClick = async (itemId: string) => {
    const item = menuItems.find(item => item.id === itemId);
    if (!item) return;

    // Verificar si el item está habilitado
    if (!isMenuItemEnabled(item)) {
      const statusMsg = getMenuItemStatusMessage(item);
      setResponse(`🚫 Cannot execute: ${item.label}\n${statusMsg}`);
      return;
    }

    setSelectedItem(itemId);

    // Handle Git operations
    if (itemId === 'clone-master') {
      await cloneMicroservices('master');
    } else if (itemId === 'review-branches') {
      setActiveView('review-branches');
      setResponse(`🌿 Opening Review Branches for workspace: ${workspacePath}\n📁 Repositories: ${workspaceValidation.existing_repos.join(', ')}`);
    }

    // Handle Azure Tools
    else if (itemId === 'product-data') {
      setShowProductDataModal(true);
      setResponse(`📦 Opening Product Data Inspector...\n📂 Ready to analyze product metadata`);
    } else if (itemId === 'azure-download') {
      setShowDownloadModal(true);
      setResponse(`☁️ Opening Azure Download Center...\n📂 Target: ${workspacePath}`);
    }

    // Handle Data Processing
    else if (itemId === 'duplicate-mdd') {
      setShowDuplicateMDDModal(true);
      setResponse(`📋 Opening MDD Duplicator...\n📂 Workspace: ${workspacePath}\n🔄 Ready to duplicate and combine files`);
    } else if (itemId === 'create-structure') {
      setShowCreateStructureModal(true);
      setResponse(`🏗️ Opening Project Structure Creator...\n📂 Workspace: ${workspacePath}\n🌿 Microservices: ${workspaceValidation.existing_repos.join(', ')}\n⚡ Ready to deploy quantum architecture`);
    } else if (itemId === 'q-chunks-processor') {
      setShowQChunksModal(true);
      setResponse(`⚙️ Opening ODIN Chunks Processor...\n📂 Workspace: ${workspacePath}\n🔧 Ready to process .odin files and generate Template_Chunks structure`);
    }

    // Handler Shortcuts:
    else if (itemId === 'shortcuts') {
      setShowShortcutsModal(true);
      setResponse(`🌐 Opening Quantum Shortcuts Portal...\n⚡ Accessing divine portal matrix`);
    }

    // Handle Utilities
    else {
      setResponse(`🔧 Selected: ${item.label}`);
    }
  };

  const renderMainContent = () => {
    if (activeView === 'review-branches') {
      return (
        <ReviewBranches
          workspacePath={workspacePath}
          onClose={handleCloseReviewBranches}
        />
      );
    }

    return (
      <>
        <main className="nexus-main">
          <div className="control-panel">
            <div className="panel-header">
              <div className="panel-icon">🌐</div>
              <h2>Quantum Command Center</h2>
              <div className="panel-status">
                <div className="status-dot"></div>
                ONLINE
              </div>
            </div>

            <div className="input-matrix">
              <label className="input-label">
                <span className="label-icon">📂</span>
                Workspace Directory Path
              </label>
              <div className="input-container">
                <input
                  type="text"
                  value={workspacePath}
                  onChange={(e) => setWorkspacePath(e.target.value)}
                  className="cyber-input"
                  placeholder="Selected folder path will appear here..."
                />

                <SmartTooltipWrapper
                  content={{
                    icon: '📁',
                    message: 'Select Workspace',
                    detail: 'Open native folder picker to choose your workspace directory',
                    type: 'info'
                  }}
                  enabled={true}
                  delay={300}
                >
                  <button
                    className="input-button"
                    onClick={selectWorkspaceFolder}
                  >
                    📁 Select Folder
                  </button>
                </SmartTooltipWrapper>

                <div className="input-scanner"></div>
              </div>

              {isWorkspaceSelected && (
                <div className="workspace-status-info">
                  <div className={`status-${workspaceValidation.has_microservices ? 'success' : 'warning'}`}>
                    {workspaceValidation.has_microservices ? '✅' : '⚠️'} Workspace: {workspacePath}
                    {workspaceValidation.has_microservices && (
                      <div className="repos-found">
                        🌿 Found repositories: {workspaceValidation.existing_repos.join(', ')}
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="input-helper">
                🎯 Click "Select Folder" for native folder picker or type manually
              </div>
            </div>

            <div className="action-matrix">
              <SmartTooltipWrapper
                content={{
                  icon: '🔗',
                  message: 'Neural Link Test',
                  detail: 'Test connection to backend API server on port 8000',
                  type: 'info'
                }}
                enabled={true}
                delay={300}
              >
                <HolographicButton
                  onClick={testAPI}
                  variant="secondary"
                  icon="🔗"
                >
                  Neural Link Test
                </HolographicButton>
              </SmartTooltipWrapper>

              <SmartTooltipWrapper
                content={{
                  icon: !isWorkspaceSelected ? '⚠️' : '✅',
                  message: 'Open Workspace',
                  detail: !isWorkspaceSelected
                    ? 'Select a workspace folder first'
                    : `Open workspace in File Explorer`,
                  type: !isWorkspaceSelected ? 'warning' : 'success'
                }}
                enabled={true}
                delay={300}
              >
                <HolographicButton
                  onClick={openWorkspaceFolder}
                  variant="primary"
                  icon="📂"
                  disabled={!isWorkspaceSelected}
                >
                  Open Workspace
                </HolographicButton>
              </SmartTooltipWrapper>
            </div>

            {response && (
              <div className="response-terminal">
                <div className="terminal-header">
                  <div className="terminal-controls">
                    <div className="control-dot red"></div>
                    <div className="control-dot yellow"></div>
                    <div className="control-dot green"></div>
                  </div>
                  <span className="terminal-title">SYSTEM_OUTPUT.log</span>
                </div>
                <div className="terminal-content">
                  {response.split('\n').map((line, index) => (
                    <div key={index} className="terminal-line">
                      <span className="line-number">{String(index + 1).padStart(3, '0')}</span>
                      <span className="line-content">{line}</span>
                    </div>
                  ))}
                  <div className="terminal-cursor">▋</div>
                </div>
              </div>
            )}

            {selectedItem && activeView === 'main' && (
              <div className="selected-item-info">
                <div className="info-header">
                  <span className="info-icon">
                    {menuItems.find(item => item.id === selectedItem)?.icon}
                  </span>
                  <h3>{menuItems.find(item => item.id === selectedItem)?.label}</h3>
                </div>
                <p>{menuItems.find(item => item.id === selectedItem)?.desc}</p>

                {(() => {
                  const item = menuItems.find(item => item.id === selectedItem);
                  if (!item) return null;

                  const enabled = isMenuItemEnabled(item);

                  if (!enabled) {
                    return (
                      <div className="status-warning">
                        Item not available - check requirements
                      </div>
                    );
                  }

                  return null;
                })()}
              </div>
            )}
          </div>

          <aside className="main-menu">
            <div className="menu-header">
              <div className="menu-icon">⚡</div>
              <h3>OPERATIONS</h3>
            </div>

            {categories.map(category => (
              <div key={category} className="menu-section">
                <div className="section-title">{category}</div>

                {menuItems
                  .filter(item => item.category === category)
                  .map(item => {
                    const enabled = isMenuItemEnabled(item);
                    const tooltipContent = getTooltipContent(item, enabled);

                    return (
                      <SmartTooltipWrapper
                        key={item.id}
                        content={tooltipContent}
                        enabled={true}
                        delay={400}
                      >
                        <div
                          className={`menu-item ${selectedItem === item.id ? 'active' : ''} ${!enabled ? 'disabled' : ''}`}
                          onClick={() => handleMenuItemClick(item.id)}
                        >
                          <div className="item-icon">{item.icon}</div>
                          <div className="item-info">
                            <div className="item-label">{item.label}</div>
                            <div className="item-desc">{item.desc}</div>
                          </div>
                          <div className="item-status">
                            <div className={`status-indicator ${selectedItem === item.id ? 'active' :
                              enabled ? 'ready' : 'disabled'
                              }`}></div>
                          </div>

                          {(item.requiresWorkspace || item.requiresMicroservices) && (
                            <div className="item-requirements">
                              {item.requiresWorkspace && (
                                <span className={`req-badge ${isWorkspaceSelected ? 'met' : 'unmet'}`}>
                                  📁
                                </span>
                              )}
                              {item.requiresMicroservices && (
                                <span className={`req-badge ${workspaceValidation.has_microservices ? 'met' : 'unmet'}`}>
                                  🌿
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </SmartTooltipWrapper>
                    );
                  })}
              </div>
            ))}
          </aside>
        </main>
      </>
    );
  };

  // 🔥 MOSTRAR SPLASH SCREEN SI ESTÁ CARGANDO
  if (isAppLoading) {
    return <SplashScreen onLoadingComplete={handleSplashComplete} />;
  }

  // 🔥 MOSTRAR APP PRINCIPAL CUANDO HAYA TERMINADO EL SPLASH
  return (
    <div className={`nexus-app ${activeView === 'review-branches' ? 'review-branches-mode' : ''}`}>
      <FuturisticBackground />
      <NeonDock />

      <header className="nexus-header">
        <h1 className="nexus-title">
          <span className="title-main">KAPTOOLS</span>
          <div className="title-separator"></div>
          <span className="title-sub">NEXUS</span>
        </h1>
        <div className="title-tagline">KANTAR • KAP • DP</div>

        {activeView === 'review-branches' && (
          <div className="view-indicator">
            <span className="view-icon">🌿</span>
            <span className="view-name">Review Branches</span>
          </div>
        )}
      </header>



      {/* 🤖 COPILOT 365 FLOATING BUTTON */}
      <div className="copilot-floating-button">
        <SmartTooltipWrapper
          content={{
            icon: '🤖',
            message: 'Open Microsoft Copilot 365',
            detail: 'Launch native Microsoft Copilot application for Windows',
            type: 'info'
          }}
          enabled={true}
          delay={300}
        >
          <button
            className="copilot-button"
            onClick={async () => {
              try {
                const { invoke } = await import('@tauri-apps/api/core');
                await invoke('open_copilot_365');
                setResponse('🤖 Opening Microsoft Copilot 365...\n🌐 Launching native Windows application');
              } catch (error) {
                setResponse('❌ Could not open Copilot 365\n💡 Check your internet connection');
              }
            }}
          >
            <img 
              src="https://img.icons8.com/fluency/48/microsoft-copilot.png" 
              alt="Copilot" 
              width="48" 
              height="48" 
            />
          </button>
        </SmartTooltipWrapper>
      </div>


      {renderMainContent()}

      <footer className="nexus-footer">
        <div className="footer-grid">
          <span>•</span>
          <span className="footer-highlight">KapTools Nexus v2.0.0</span>
          <span>•</span>
          <span className="footer-workspace">
            {isWorkspaceSelected ? `📂 ${workspacePath}` : '📂 No workspace'}
          </span>
          <span>•</span>
          {activeView === 'review-branches' && (
            <>
              <span className="footer-view">🌿 Review Branches Active</span>
              <span>•</span>
            </>
          )}
        </div>
      </footer>

      {/* Todos los modales */}
      <DownloadFiles
        isOpen={showDownloadModal}
        onClose={handleCloseDownloadModal}
        workspacePath={workspacePath}
      />

      <ProductData
        isOpen={showProductDataModal}
        onClose={() => {
          setShowProductDataModal(false);
          setSelectedItem('');
          setResponse('📦 Product Data Inspector closed');
        }}
        workspacePath={workspacePath}
      />

      <DuplicateMDD
        isOpen={showDuplicateMDDModal}
        onClose={handleCloseDuplicateMDDModal}
        workspacePath={workspacePath}
      />

      <CreateStructure
        isOpen={showCreateStructureModal}
        onClose={handleCloseCreateStructureModal}
        workspacePath={workspacePath}
      />

      <QChunksProcessor
        isOpen={showQChunksModal}
        onClose={() => {
          setShowQChunksModal(false);
          setSelectedItem('');
          setResponse('⚙️ ODIN Chunks Processor closed');
        }}
        workspacePath={workspacePath}
      />

      <ShortcutsNexus
        isOpen={showShortcutsModal}
        onClose={() => {
          setShowShortcutsModal(false);
          setSelectedItem('');
          setResponse('🌐 Quantum Shortcuts Portal closed');
        }}
      />

      {/* 🤖 COPILOT MODAL */}
      {showCopilotModal && (
        <div className="copilot-modal-overlay">
          <div className="copilot-modal">
            <div className="copilot-header">
              <div className="copilot-header-content">
                <div className="copilot-icon">🤖</div>
                <div className="copilot-title">
                  <h2>KapChat AI Assistant</h2>
                  <p>Your quantum AI companion for KapTools</p>
                </div>
              </div>
              <button
                className="copilot-close-button"
                onClick={() => {
                  setShowCopilotModal(false);
                  setResponse('🤖 KapChat AI Assistant closed');
                }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </button>
            </div>
            <div className="copilot-content">
              <div className="copilot-placeholder">
                <div className="placeholder-icon">🚧</div>
                <h3>Coming Soon</h3>
                <p>KapChat AI Assistant is under development</p>
                <p>This will be your intelligent companion for:</p>
                <ul>
                  <li>🎯 Project guidance and best practices</li>
                  <li>🔧 Technical troubleshooting</li>
                  <li>📊 Data analysis insights</li>
                  <li>⚡ Workflow optimization</li>
                  <li>🤝 Step-by-step tutorials</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;