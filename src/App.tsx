// src/App.tsx - ACTUALIZADO con validación para Review Branches y DownloadFiles

import { useState, useEffect } from "react";
import HolographicButton from "./components/HolographicButton";
import FuturisticBackground from "./components/FuturisticBackground";
import NeonDock from "./components/NeonDock";
import ReviewBranches from "./components/ReviewBranches";
import DownloadFiles from "./components/DownloadFiles";
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
  const [showDownloadModal, setShowDownloadModal] = useState(false);
  
  // 🔥 NUEVO: Estado de validación del workspace
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
      requiresMicroservices: true  // 🔥 REQUIERE MICROSERVICIOS
    },
    
    // Azure Tools
    { id: 'azure-download', label: 'Download Files', desc: 'BEE, CeV and Link', icon: '☁️', category: 'AZURE TOOLS' },
    { id: 'product-data', label: 'Product Data', desc: 'Review products', icon: '📦', category: 'AZURE TOOLS' },
    
    // Data Processing
    { id: 'duplicate-mdd', label: 'Duplicate MDD', desc: 'Duplicate base files', icon: '📋', category: 'DATA PROCESSING' },
    { id: 'create-structure', label: 'Create Structure', desc: 'Project scaffolding', icon: '🏗️', category: 'DATA PROCESSING' },
    
    // Utilities
    { id: 'kapchat', label: 'KapChat', desc: 'AI Support', icon: '🤖', category: 'UTILITIES' },
    { id: 'jsonpath', label: 'JsonPath Tool', desc: 'JSON query tool', icon: '🔧', category: 'UTILITIES' },
    { id: 'shortcuts', label: 'Shortcuts', desc: 'Quick links panel', icon: '🌐', category: 'UTILITIES' }
  ];

  const categories = [...new Set(menuItems.map(item => item.category))];

  // Verificar si hay workspace seleccionado
  const isWorkspaceSelected = workspacePath !== 'Path of your workspace';

  // 🔥 NUEVA FUNCIÓN: Validar workspace cuando cambie
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

  // 🔥 NUEVA FUNCIÓN: Validar workspace con el backend
  const validateWorkspace = async () => {
    if (!isWorkspaceSelected) return;

    try {
      const res = await fetch(`http://127.0.0.1:8000/git/validate-workspace?workspace_path=${encodeURIComponent(workspacePath)}`);
      
      if (res.ok) {
        const data = await res.json();
        setWorkspaceValidation(data);
        
        // Actualizar respuesta visual
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

  // 🔥 FUNCIÓN ACTUALIZADA: Verificar si item está habilitado
  const isMenuItemEnabled = (item: MenuItem): boolean => {
    if (item.requiresWorkspace && !isWorkspaceSelected) {
      return false;
    }
    
    if (item.requiresMicroservices && !workspaceValidation.has_microservices) {
      return false;
    }
    
    return true;
  };

  // 🔥 FUNCIÓN ACTUALIZADA: Obtener mensaje de estado del item
  const getMenuItemStatusMessage = (item: MenuItem): string => {
    if (item.requiresWorkspace && !isWorkspaceSelected) {
      return "❌ Requires workspace selection";
    }
    
    if (item.requiresMicroservices && !workspaceValidation.has_microservices) {
      return "⚠️ Requires microservices (clone them first)";
    }
    
    return "✅ Ready";
  };

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
      // Solo se ejecuta si hay microservicios (ya validado arriba)
      setActiveView('review-branches');
      setResponse(`🌿 Opening Review Branches for workspace: ${workspacePath}\n📁 Repositories: ${workspaceValidation.existing_repos.join(', ')}`);
    } else if (itemId === 'azure-download') {
      // 🔥 NUEVO: Abrir modal de descarga
      if (!isWorkspaceSelected) {
        setResponse('❌ Must select workspace first');
        return;
      }
      setShowDownloadModal(true);
      setResponse(`☁️ Opening Azure Download Center...\n📂 Target: ${workspacePath}`);
    } else {
      setResponse(`🔧 Selected: ${item.label}`);
    }
  };

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
                <button 
                  className="input-button"
                  onClick={selectWorkspaceFolder}
                  title="Open native folder selector"
                >
                  📁 Select Folder
                </button>
                <div className="input-scanner"></div>
              </div>
              
              {/* Workspace Status - Simplificado */}
              {isWorkspaceSelected && (
                <div className="workspace-status-info">
                  <div className={`status-${workspaceValidation.has_microservices ? 'success' : 'warning'}`}>
                    ✅ Workspace ready: {workspacePath}
                  </div>
                </div>
              )}
              
              {/* Quick path buttons */}
              <div className="quick-paths">
                <button 
                  className="quick-path-btn"
                  onClick={() => {
                    setWorkspacePath("C:\\temp\\workspace");
                    setResponse("📁 Quick path set: C:\\temp\\workspace");
                  }}
                >
                  📁 C:\temp\workspace
                </button>
                <button 
                  className="quick-path-btn"
                  onClick={() => {
                    setWorkspacePath("D:\\Projects\\KapWorkspace");
                    setResponse("📁 Quick path set: D:\\Projects\\KapWorkspace");
                  }}
                >
                  📁 D:\Projects\KapWorkspace
                </button>
              </div>
              
              {/* Info helper */}
              <div className="input-helper">
                🎯 Click "Select Folder" for native folder picker, use quick paths, or type manually
              </div>
            </div>

            {/* Quick Action Buttons - SIMPLIFICADO */}
            <div className="action-matrix">
              <HolographicButton
                onClick={testAPI}
                variant="secondary"
                icon="🔗"
              >
                Neural Link Test
              </HolographicButton>

              <HolographicButton
                onClick={openWorkspaceFolder}
                variant="primary"
                icon="📂"
                disabled={!isWorkspaceSelected}
              >
                Open Workspace
              </HolographicButton>
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
                
                {/* Estado simplificado del item */}
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

          {/* Panel Lateral de Stats */}
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
                    
                    return (
                      <div 
                        key={item.id}
                        className={`menu-item ${selectedItem === item.id ? 'active' : ''} ${!enabled ? 'disabled' : ''}`}
                        onClick={() => handleMenuItemClick(item.id)}
                        title={!enabled ? getMenuItemStatusMessage(item) : ''}
                      >
                        <div className="item-icon">{item.icon}</div>
                        <div className="item-info">
                          <div className="item-label">{item.label}</div>
                          <div className="item-desc">{item.desc}</div>
                        </div>
                        <div className="item-status">
                          <div className={`status-indicator ${
                            selectedItem === item.id ? 'active' : 
                            enabled ? 'ready' : 'disabled'
                          }`}></div>
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
      {/* Fondo futurista */}
      <FuturisticBackground />
      
      {/* Dock lateral izquierdo */}
      <NeonDock />

      {/* Header Holográfico */}
      <header className="nexus-header">
        <h1 className="nexus-title">
          <span className="title-main">KAPTOOLS</span>
          <div className="title-separator"></div>
          <span className="title-sub">NEXUS</span>
        </h1>
        <div className="title-tagline">KANTAR • KAP • DP</div>
        
        {/* Indicador de vista activa */}
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

      {/* 🔥 NUEVO: Modal de descarga de archivos */}
      <DownloadFiles 
        isOpen={showDownloadModal}
        onClose={handleCloseDownloadModal}
        workspacePath={workspacePath}
      />
    </div>
  );
}

export default App;