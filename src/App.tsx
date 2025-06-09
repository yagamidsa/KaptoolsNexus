// src/App.tsx - COMPLETO CON TOOLTIPS RESPONSIVOS

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
  const [response, setResponse] = useState("");
  const [loading, setLoading] = useState(false);
  const [selectedItem, setSelectedItem] = useState<string>('');
  const [workspacePath, setWorkspacePath] = useState<string>('Path of your workspace');
  const [activeView, setActiveView] = useState<'main' | 'review-branches'>('main');

  // 🔥 ESTADOS DE MODALES
  const [showDownloadModal, setShowDownloadModal] = useState(false);
  const [showProductDataModal, setShowProductDataModal] = useState(false);
  const [showDuplicateMDDModal, setShowDuplicateMDDModal] = useState(false);
  const [showCreateStructureModal, setShowCreateStructureModal] = useState(false);
  const [showShortcutsModal, setShowShortcutsModal] = useState(false);

  // 🔥 ESTADO DE VALIDACIÓN DEL WORKSPACE
  const [workspaceValidation, setWorkspaceValidation] = useState<WorkspaceValidation>({
    valid: false,
    has_microservices: false,
    existing_repos: [],
    workspace_path: ''
  });

  const menuItems: MenuItem[] = [
    // Git Operations
    {
      id: 'clone-develop',
      label: 'Clone Repos (Develop)',
      desc: 'Deploy microservices develop',
      icon: '🌿',
      category: 'GIT OPERATIONS',
      requiresWorkspace: true
    },
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
      category: 'AZURE TOOLS'
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
      id: 'shortcuts',
      label: 'Quantum Shortcuts',
      desc: 'Divine portal matrix',
      icon: '🌐',
      category: 'UTILITIES'
    }
  ];

  const categories = [...new Set(menuItems.map(item => item.category))];

  // Verificar si hay workspace seleccionado
  const isWorkspaceSelected = workspacePath !== 'Path of your workspace';

  // 🔥 FUNCIÓN HELPER PARA TOOLTIPS DINÁMICOS
  const getTooltipContent = (item: MenuItem, enabled: boolean) => {
    if (enabled) {
      return {
        icon: '✅',
        message: `Ready to execute`,
        detail: `${item.desc}`,
        type: 'success'
      };
    }

    if (item.requiresWorkspace && !isWorkspaceSelected) {
      return {
        icon: '📁',
        message: `Requires workspace selection`,
        detail: 'Select workspace folder first',
        type: 'warning'
      };
    }

    if (item.requiresMicroservices && !workspaceValidation.has_microservices) {
      return {
        icon: '🌿',
        message: `Requires microservices`,
        detail: 'Clone microservices first',
        type: 'error'
      };
    }

    return {
      icon: 'ℹ️',
      message: `${item.desc}`,
      detail: 'Click to execute',
      type: 'info'
    };
  };

  // 🔥 VALIDAR WORKSPACE CUANDO CAMBIE
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

  // 🔥 VALIDAR WORKSPACE CON EL BACKEND
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
      setResponse("🔍 Opening native folder selector...");

      const { invoke } = await import('@tauri-apps/api/core');
      const selectedPath = await invoke('select_folder') as string | null;

      if (selectedPath) {
        setWorkspacePath(selectedPath);
        setResponse(`📁 Workspace folder selected:\n📁 ${selectedPath}\n🔄 Validating...`);
        console.log('Selected workspace:', selectedPath);
      } else {
        setResponse("❌ No folder selected - User cancelled or dialog closed");
      }
    } catch (error) {
      console.error('Error opening folder selector:', error);
      setResponse(`❌ Folder selector error\n💡 Please try again or use quick paths\n\nError details: ${error}`);
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
        // Re-validar workspace después del clone
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

  // 🔥 VERIFICAR SI ITEM ESTÁ HABILITADO
  const isMenuItemEnabled = (item: MenuItem): boolean => {
    if (item.requiresWorkspace && !isWorkspaceSelected) {
      return false;
    }

    if (item.requiresMicroservices && !workspaceValidation.has_microservices) {
      return false;
    }

    return true;
  };

  // 🔥 OBTENER MENSAJE DE ESTADO DEL ITEM
  const getMenuItemStatusMessage = (item: MenuItem): string => {
    if (item.requiresWorkspace && !isWorkspaceSelected) {
      return "❌ Requires workspace selection";
    }

    if (item.requiresMicroservices && !workspaceValidation.has_microservices) {
      return "⚠️ Requires microservices (clone them first)";
    }

    return "✅ Ready";
  };

  // 🔥 HANDLERS PARA CERRAR MODALES
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

  // 🔥 HANDLER PRINCIPAL DEL MENÚ
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
    if (itemId === 'clone-develop') {
      await cloneMicroservices('develop');
    } else if (itemId === 'clone-master') {
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
      if (!isWorkspaceSelected) {
        setResponse('❌ Must select workspace first');
        return;
      }
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
        {/* Panel de Control Principal */}
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

            {/* Workspace Selection */}
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

                {/* 🔥 BOTÓN SELECT FOLDER CON TOOLTIP */}
                <div className="cyber-tooltip tooltip-info">
                  <button
                    className="input-button"
                    onClick={selectWorkspaceFolder}
                  >
                    📁 Select Folder
                  </button>
                  <div className="tooltip-content">
                    <span className="tooltip-icon info">📁</span>
                    <div>
                      <strong>Select Workspace</strong>
                      <br />
                      Open native folder picker to choose your workspace directory
                      <br />
                      <small>💡 Choose a folder where microservices will be cloned</small>
                    </div>
                  </div>
                </div>

                <div className="input-scanner"></div>
              </div>

              {/* Workspace Status */}
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

            {/* Quick Action Buttons */}
            <div className="action-matrix">
              {/* 🔥 BOTÓN TEST API CON TOOLTIP */}
              <div className="cyber-tooltip tooltip-info">
                <HolographicButton
                  onClick={testAPI}
                  variant="secondary"
                  icon="🔗"
                >
                  Neural Link Test
                </HolographicButton>
                <div className="tooltip-content">
                  <span className="tooltip-icon info">🔗</span>
                  <div>
                    <strong>Neural Link Test</strong>
                    <br />
                    Test connection to the backend API server
                    <br />
                    <small>🎯 Connects to port 8000</small>
                  </div>
                </div>
              </div>

              {/* 🔥 BOTÓN OPEN WORKSPACE CON TOOLTIP */}
              <div className={`cyber-tooltip ${!isWorkspaceSelected ? 'tooltip-warning' : 'tooltip-success'}`}>
                <HolographicButton
                  onClick={openWorkspaceFolder}
                  variant="primary"
                  icon="📂"
                  disabled={!isWorkspaceSelected}
                >
                  Open Workspace
                </HolographicButton>
                <div className="tooltip-content">
                  <span className={`tooltip-icon ${!isWorkspaceSelected ? 'warning' : 'success'}`}>
                    {!isWorkspaceSelected ? '⚠️' : '✅'}
                  </span>
                  <div>
                    <strong>Open Workspace</strong>
                    <br />
                    {!isWorkspaceSelected
                      ? 'Select a workspace folder first'
                      : `Open workspace in File Explorer`
                    }
                    {isWorkspaceSelected && (
                      <>
                        <br />
                        <small>📂 Path: {workspacePath}</small>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Response Terminal */}
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

            {/* Selected Item Info */}
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

          {/* 🔥 PANEL LATERAL DE MENU CON TOOLTIPS RESPONSIVOS */}
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

                    // 🔥 DETERMINAR CLASE DE TOOLTIP CON POSICIONAMIENTO PARA MENÚ LATERAL
                    let tooltipClass = `cyber-tooltip tooltip-${tooltipContent.type}`;

                    return (
                      <div
                        key={item.id}
                        className={tooltipClass}
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
                        </div>

                        {/* 🔥 TOOLTIP CONTENT RESPONSIVO */}
                        <div className="tooltip-content multiline">
                          <div>
                            <span className={`tooltip-icon ${tooltipContent.type}`}>
                              {tooltipContent.icon}
                            </span>
                            <strong>{item.label}</strong>
                          </div>
                          <div>
                            {tooltipContent.message}
                            {tooltipContent.detail && (
                              <>
                                <br />
                                <em>💡 {tooltipContent.detail}</em>
                              </>
                            )}

                            {/* 🔥 REQUIREMENTS BADGES */}
                            {(item.requiresWorkspace || item.requiresMicroservices) && (
                              <div className="item-requirements">
                                {item.requiresWorkspace && (
                                  <span className={`req-badge ${isWorkspaceSelected ? 'met' : 'unmet'}`}>
                                    📁 Workspace
                                  </span>
                                )}
                                {item.requiresMicroservices && (
                                  <span className={`req-badge ${workspaceValidation.has_microservices ? 'met' : 'unmet'}`}>
                                    🌿 Microservices
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            ))}
          </aside>
        </main>
      </>
    );
  };

  return (
    <div className={`nexus-app ${activeView === 'review-branches' ? 'review-branches-mode' : ''}`}>
      <FuturisticBackground />
      <NeonDock />

      {/* Header Holográfico */}
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

      {/* Contenido Principal Dinámico */}
      {renderMainContent()}

      {/* Footer Cyber */}
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

      {/* 🔥 TODOS LOS MODALES */}
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

      <ShortcutsNexus
        isOpen={showShortcutsModal}
        onClose={() => {
          setShowShortcutsModal(false);
          setSelectedItem('');
          setResponse('🌐 Quantum Shortcuts Portal closed');
        }}
      />
    </div>
  );
}

export default App;