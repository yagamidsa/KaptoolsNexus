import { useState } from 'react';
import './CreateStructure.css'; // ✅ Importar el CSS neon

interface CreateStructureProps {
    isOpen: boolean;
    onClose: () => void;
    workspacePath: string;
}

const CreateStructure: React.FC<CreateStructureProps> = ({
    isOpen,
    onClose,
    workspacePath
}) => {
    const [loading, setLoading] = useState(false);
    const [selectedMddFile, setSelectedMddFile] = useState<File | null>(null);
    const [selectedDdfFile, setSelectedDdfFile] = useState<File | null>(null);
    const [projectName, setProjectName] = useState('');
    const [logs, setLogs] = useState<string[]>([]);
    const [step, setStep] = useState<'select' | 'creating'>('select');
    const [progress, setProgress] = useState(0);

    const addLog = (message: string) => {
        const timestamp = new Date().toLocaleTimeString();
        setLogs(prev => [...prev, `[${timestamp}] ${message}`]);
    };

    // Clasificar logs por tipo para aplicar estilos
    const getLogClass = (log: string) => {
        if (log.includes('❌')) return 'log-entry error';
        if (log.includes('✅') || log.includes('🎉')) return 'log-entry success';
        if (log.includes('⚠️')) return 'log-entry warning';
        return 'log-entry info';
    };

    const handleMddFileSelect = () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.mdd';
        
        input.onchange = (e) => {
            const file = (e.target as HTMLInputElement).files?.[0];
            if (file) {
                if (!file.name.toLowerCase().endsWith('.mdd')) {
                    addLog('❌ Only .mdd files are supported');
                    return;
                }
                
                setSelectedMddFile(file);
                setProjectName(file.name.replace('.mdd', ''));
                addLog(`📁 MDD Selected: ${file.name} (${(file.size / 1024).toFixed(2)} KB)`);
                
                if (selectedDdfFile) {
                    const mddBaseName = file.name.replace('.mdd', '');
                    const ddfBaseName = selectedDdfFile.name.replace('.ddf', '');
                    if (mddBaseName !== ddfBaseName) {
                        setSelectedDdfFile(null);
                        addLog('⚠️ DDF cleared - file names must match');
                    }
                }
            }
            document.body.removeChild(input);
        };
        
        document.body.appendChild(input);
        input.click();
    };

    const handleDdfFileSelect = () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.ddf';
        
        input.onchange = (e) => {
            const file = (e.target as HTMLInputElement).files?.[0];
            if (file) {
                if (!file.name.toLowerCase().endsWith('.ddf')) {
                    addLog('❌ Only .ddf files are supported');
                    return;
                }
                
                if (selectedMddFile) {
                    const mddBaseName = selectedMddFile.name.replace('.mdd', '');
                    const ddfBaseName = file.name.replace('.ddf', '');
                    
                    if (mddBaseName !== ddfBaseName) {
                        addLog(`❌ File names must match. MDD: "${mddBaseName}", DDF: "${ddfBaseName}"`);
                        return;
                    }
                }
                
                setSelectedDdfFile(file);
                addLog(`📁 DDF Selected: ${file.name} (${(file.size / 1024).toFixed(2)} KB)`);
            }
            document.body.removeChild(input);
        };
        
        document.body.appendChild(input);
        input.click();
    };

    const fileToBase64 = (file: File): Promise<string> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
                const result = reader.result as string;
                const base64 = result.split(',')[1];
                resolve(base64);
            };
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    };

    const createStructure = async () => {
        if (!selectedMddFile) {
            addLog('❌ MDD file is required');
            return;
        }

        if (!selectedDdfFile) {
            addLog('❌ DDF file is required');
            return;
        }

        if (!projectName.trim()) {
            addLog('❌ Project name is required');
            return;
        }

        if (!/^[a-zA-Z0-9_-]+$/.test(projectName.trim())) {
            addLog('❌ Project name can only contain letters, numbers, underscores, and hyphens');
            return;
        }

        setLoading(true);
        setStep('creating');
        setProgress(0);

        try {
            addLog('🚀 Starting structure creation...');
            setProgress(10);

            addLog('🔍 Checking backend...');
            const healthCheck = await fetch('http://127.0.0.1:8000/health');
            if (!healthCheck.ok) {
                throw new Error('Backend not available');
            }
            addLog('✅ Backend is ready');
            setProgress(20);

            addLog('📦 Processing MDD file...');
            const mddBase64Content = await fileToBase64(selectedMddFile);
            addLog('✅ MDD file converted to base64');
            setProgress(30);

            addLog('📦 Processing DDF file...');
            const ddfBase64Content = await fileToBase64(selectedDdfFile);
            addLog('✅ DDF file converted to base64');
            setProgress(40);

            const requestData = {
                project_name: projectName.trim(),
                workspace_path: workspacePath,
                mdd_file_content: mddBase64Content,
                mdd_filename: selectedMddFile.name,
                ddf_file_content: ddfBase64Content,
                ddf_filename: selectedDdfFile.name,
                template_location: "",
                library_location: "",
                date_start: "19991201",
                date_end: "99999999"
            };

            addLog('🌐 Sending request...');
            addLog(`📡 Endpoint: /data-processing/create-structure`);
            setProgress(60);

            const response = await fetch('http://127.0.0.1:8000/data-processing/create-structure', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify(requestData)
            });

            addLog(`📨 Response: ${response.status} ${response.statusText}`);
            setProgress(80);

            if (!response.ok) {
                let errorMessage = `HTTP ${response.status}`;
                try {
                    const errorData = await response.json();
                    addLog(`❌ Server error details: ${JSON.stringify(errorData, null, 2)}`);
                    
                    if (errorData.detail && Array.isArray(errorData.detail)) {
                        errorData.detail.forEach((err: any) => {
                            addLog(`🔍 Validation error: ${err.msg} at ${err.loc?.join('.')}`);
                        });
                    }
                    
                    errorMessage = errorData.detail || errorData.message || errorMessage;
                } catch {
                    const errorText = await response.text();
                    addLog(`❌ Server response: ${errorText}`);
                    errorMessage = errorText;
                }
                throw new Error(errorMessage);
            }

            const result = await response.json();
            addLog(`✅ Response received: ${result.success ? 'SUCCESS' : 'FAILED'}`);
            setProgress(90);

            if (result.success) {
                addLog('🎉 Structure created successfully!');
                addLog(`📁 Project: ${result.data?.project_name || 'Unknown'}`);
                addLog(`📂 Location: ${result.data?.project_path || 'Unknown'}`);
                
                if (result.data?.files_created) {
                    addLog(`📋 Files created: ${result.data.files_created.length}`);
                    result.data.files_created.forEach((file: string) => {
                        addLog(`   ✅ ${file}`);
                    });
                }

                if (result.logs && Array.isArray(result.logs)) {
                    addLog('📝 Backend logs:');
                    result.logs.slice(-5).forEach((log: string) => {
                        addLog(`   ${log}`);
                    });
                }

                setProgress(100);
                addLog('🏆 Project structure with MDD and DDF completed!');
            } else {
                throw new Error(result.message || 'Unknown error from server');
            }

        } catch (error) {
            addLog(`❌ Error: ${error}`);
            console.error('Create structure error:', error);
            setProgress(0);
        } finally {
            setLoading(false);
        }
    };

    const resetForm = () => {
        setStep('select');
        setSelectedMddFile(null);
        setSelectedDdfFile(null);
        setProjectName('');
        setLogs([]);
        setProgress(0);
        setLoading(false);
    };

    const handleClose = () => {
        resetForm();
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="create-structure-modal">
            <div className="create-structure-container">
                {/* Header con efectos neon */}
                <div className="modal-header">
                    <h2 className="modal-title">
                        🏗️ Create Project Structure
                    </h2>
                    <button onClick={handleClose} className="close-button">
                        ✕
                    </button>
                </div>

                {/* Progress Bar con efectos neon */}
                {step === 'creating' && (
                    <div className="progress-container">
                        <div className="progress-info">
                            <span className={loading ? "transferring" : ""}>
                                Creating Structure...
                            </span>
                            <span>{Math.round(progress)}%</span>
                        </div>
                        <div className="progress-bar-container">
                            <div 
                                className={`progress-bar ${progress === 100 ? 'complete' : ''}`}
                                style={{ width: `${progress}%` }}
                            />
                        </div>
                    </div>
                )}

                {step === 'select' && (
                    <div>
                        {/* Workspace Info con efectos */}
                        <div className="workspace-info">
                            <h4 className="workspace-title">🎯 Target Workspace</h4>
                            <p className="workspace-path">{workspacePath}</p>
                        </div>

                        {/* MDD File Selection */}
                        <div className="file-section">
                            <h4 className="file-label">Select MDD File (Metadata)</h4>
                            
                            <div
                                onClick={handleMddFileSelect}
                                className={`file-drop-zone ${selectedMddFile ? 'has-file' : ''}`}
                            >
                                <span className="file-icon">
                                    {selectedMddFile ? '📋' : '📂'}
                                </span>
                                {selectedMddFile ? (
                                    <div>
                                        <div className="file-name">{selectedMddFile.name}</div>
                                        <div className="file-size">
                                            {(selectedMddFile.size / 1024).toFixed(2)} KB
                                        </div>
                                    </div>
                                ) : (
                                    <div>
                                        <div className="file-instruction">Click to select MDD file</div>
                                        <div className="file-hint">
                                            Choose your metadata file (.mdd)
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* DDF File Selection */}
                        <div className="file-section">
                            <h4 className="file-label">Select DDF File (Data)</h4>
                            
                            <div
                                onClick={handleDdfFileSelect}
                                className={`file-drop-zone ${selectedDdfFile ? 'has-file ddf-file' : ''}`}
                                style={{ opacity: selectedMddFile ? 1 : 0.6 }}
                            >
                                <span className="file-icon">
                                    {selectedDdfFile ? '💾' : '📂'}
                                </span>
                                {selectedDdfFile ? (
                                    <div>
                                        <div className="file-name">{selectedDdfFile.name}</div>
                                        <div className="file-size">
                                            {(selectedDdfFile.size / 1024).toFixed(2)} KB
                                        </div>
                                    </div>
                                ) : (
                                    <div>
                                        <div className="file-instruction">Click to select DDF file</div>
                                        <div className="file-hint">
                                            Choose your data file (.ddf)
                                        </div>
                                    </div>
                                )}
                            </div>
                            
                            {/* Validation Message */}
                            {selectedMddFile && !selectedDdfFile && (
                                <div className="validation-message warning">
                                    ⚠️ DDF file should have the same base name as MDD: {projectName}.ddf
                                </div>
                            )}
                        </div>

                        {/* Project Name Input */}
                        {selectedMddFile && (
                            <div className="input-group">
                                <label className="input-label">
                                    🏷️ Project Name
                                </label>
                                <input
                                    type="text"
                                    value={projectName}
                                    onChange={(e) => setProjectName(e.target.value)}
                                    className="project-input"
                                    placeholder="Enter project name..."
                                />
                                <div className="input-hint">
                                    Only letters, numbers, underscores, and hyphens allowed
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Logs Container con efectos neon */}
                {step === 'creating' && (
                    <div className="logs-container">
                        {logs.map((log, index) => (
                            <div key={index} className={getLogClass(log)}>
                                {log}
                            </div>
                        ))}
                        {loading && <div className="cursor-blink">▋</div>}
                    </div>
                )}

                {/* Action Buttons con efectos neon */}
                <div className="actions-container">
                    <button onClick={handleClose} className="action-button cancel-button">
                        Cancel
                    </button>
                    
                    {step === 'select' && (
                        <button
                            onClick={createStructure}
                            disabled={!selectedMddFile || !selectedDdfFile || !projectName.trim() || loading}
                            className="action-button primary-button"
                        >
                            🚀 Create Structure
                        </button>
                    )}
                    
                    {step === 'creating' && (
                        <button
                            onClick={handleClose}
                            disabled={loading}
                            className={`action-button ${progress === 100 ? 'complete-button' : 'primary-button'}`}
                        >
                            {loading ? 'Creating...' : progress === 100 ? '✅ Complete' : '⏸️ Close'}
                        </button>
                    )}
                </div>

                {/* Debug Info Panel */}
                {step === 'creating' && (
                    <div className="debug-info">
                        <div>📋 MDD: {selectedMddFile?.name}</div>
                        <div>💾 DDF: {selectedDdfFile?.name}</div>
                        <div>🏗️ Project: {projectName}</div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default CreateStructure;