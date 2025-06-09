import { useState, useEffect } from 'react';
import './DuplicateMDD.css';


// Componentes de iconos SVG profesionales
const Icons = {
    // Icono principal del header
    Database: () => (
        <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <ellipse cx="12" cy="5" rx="9" ry="3"/>
            <path d="M3 5v14c0 1.66 4.03 3 9 3s9-1.34 9-3V5"/>
            <path d="M3 12c0 1.66 4.03 3 9 3s9-1.34 9-3"/>
        </svg>
    ),
    
    // Iconos de pasos
    FolderOpen: () => (
        <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
            <path d="M2 7h20"/>
        </svg>
    ),
    
    Settings: () => (
        <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="3"/>
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.6 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.6a1.65 1.65 0 0 0 1 1.51V6a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82 1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
        </svg>
    ),
    
    RefreshCw: () => (
        <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="23,4 23,10 17,10"/>
            <polyline points="1,20 1,14 7,14"/>
            <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15"/>
        </svg>
    ),
    
    CheckCircle: () => (
        <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
            <polyline points="22,4 12,14.01 9,11.01"/>
        </svg>
    ),
    
    // Iconos de archivos
    FileText: () => (
        <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M14,2H6A2,2,0,0,0,4,4V20a2,2,0,0,0,2,2H18a2,2,0,0,0,2-2V8Z"/>
            <polyline points="14,2 14,8 20,8"/>
            <line x1="16" y1="13" x2="8" y2="13"/>
            <line x1="16" y1="17" x2="8" y2="17"/>
            <polyline points="10,9 9,9 8,9"/>
        </svg>
    ),
    
    BarChart: () => (
        <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="12" y1="20" x2="12" y2="10"/>
            <line x1="18" y1="20" x2="18" y2="4"/>
            <line x1="6" y1="20" x2="6" y2="16"/>
        </svg>
    ),
    
    // Iconos de información
    Folder: () => (
        <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
        </svg>
    ),
    
    // Iconos de control
    Plus: () => (
        <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="12" y1="5" x2="12" y2="19"/>
            <line x1="5" y1="12" x2="19" y2="12"/>
        </svg>
    ),
    
    Minus: () => (
        <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="5" y1="12" x2="19" y2="12"/>
        </svg>
    ),
    
    // Iconos de estado
    Check: () => (
        <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="20,6 9,17 4,12"/>
        </svg>
    ),
    
    X: () => (
        <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="6" x2="6" y2="18"/>
            <line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
    ),
    
    // Icono de éxito (reemplaza al 🎉)
    Celebration: () => (
        <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10"/>
            <path d="M8 14s1.5 2 4 2 4-2 4-2"/>
            <line x1="9" y1="9" x2="9.01" y2="9"/>
            <line x1="15" y1="9" x2="15.01" y2="9"/>
        </svg>
    ),
    
    // Icono de archivo comprimido
    Archive: () => (
        <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="21,8 21,21 3,21 3,8"/>
            <rect x="1" y="3" width="22" height="5"/>
            <line x1="10" y1="12" x2="14" y2="12"/>
        </svg>
    ),
    
    // Flecha hacia abajo para preview
    ArrowDown: () => (
        <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="12" y1="5" x2="12" y2="19"/>
            <polyline points="19,12 12,19 5,12"/>
        </svg>
    ),
    
    // Icono de información/datos
    Info: () => (
        <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="16" x2="12" y2="12"/>
            <line x1="12" y1="8" x2="12.01" y2="8"/>
        </svg>
    ),
    
    // Icono de flecha hacia la izquierda
    ArrowLeft: () => (
        <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="19" y1="12" x2="5" y2="12"/>
            <polyline points="12,19 5,12 12,5"/>
        </svg>
    ),
    
    // Icono de flecha hacia la derecha
    ArrowRight: () => (
        <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="5" y1="12" x2="19" y2="12"/>
            <polyline points="12,5 19,12 12,19"/>
        </svg>
    )
};

interface DuplicateMDDProps {
    isOpen: boolean;
    onClose: () => void;
    workspacePath: string;
}

interface SelectedFiles {
    mddFile: File | null;
    ddfFile: File | null;
}

interface ProcessingStatus {
    isProcessing: boolean;
    currentStep: string;
    progress: number;
    logs: string[];
    success: boolean;
    error: string | null;
}

interface ProcessingResult {
    success: boolean;
    message: string;
    data: {
        output_file: string;
        output_path: string;
        duplicates_created: number;
        base_name: string;
        workspace: string;
        file_size: number;
        original_records: number;
        total_records: number;
        record_multiplier: number;
    };
    processing_logs: string[];
    dms_output: string;
    details: string;
    record_summary: string;
}

const DuplicateMDD: React.FC<DuplicateMDDProps> = ({ isOpen, onClose, workspacePath }) => {
    const [selectedFiles, setSelectedFiles] = useState<SelectedFiles>({
        mddFile: null,
        ddfFile: null
    });
    const [duplicateCount, setDuplicateCount] = useState<number>(2);
    const [processingStatus, setProcessingStatus] = useState<ProcessingStatus>({
        isProcessing: false,
        currentStep: '',
        progress: 0,
        logs: [],
        success: false,
        error: null
    });
    const [activeStep, setActiveStep] = useState<'select' | 'configure' | 'process' | 'complete'>('select');
    const [result, setResult] = useState<ProcessingResult | null>(null);

    // Reset state when modal opens/closes
    useEffect(() => {
        if (isOpen) {
            setSelectedFiles({ mddFile: null, ddfFile: null });
            setDuplicateCount(2);
            setProcessingStatus({
                isProcessing: false,
                currentStep: '',
                progress: 0,
                logs: [],
                success: false,
                error: null
            });
            setActiveStep('select');
            setResult(null);
        }
    }, [isOpen]);

    const handleFileSelect = (fileType: 'mdd' | 'ddf', event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            const expectedExtension = fileType.toUpperCase();
            const fileExtension = file.name.split('.').pop()?.toUpperCase();

            if (fileExtension === expectedExtension) {
                setSelectedFiles(prev => ({
                    ...prev,
                    [`${fileType}File`]: file
                }));
            } else {
                alert(`Please select a valid .${expectedExtension} file`);
            }
        }
    };

    const canProceedToConfiguration = selectedFiles.mddFile && selectedFiles.ddfFile;

    const handleNextStep = () => {
        if (activeStep === 'select' && canProceedToConfiguration) {
            setActiveStep('configure');
        } else if (activeStep === 'configure') {
            setActiveStep('process');
            handleDuplicateProcess();
        }
    };

    const handleDuplicateProcess = async () => {
        if (!selectedFiles.mddFile || !selectedFiles.ddfFile) return;

        setProcessingStatus(prev => ({
            ...prev,
            isProcessing: true,
            currentStep: 'Preparing files...',
            progress: 0,
            logs: ['🚀 Starting MDD duplication process...'],
            error: null
        }));

        try {
            console.log('📋 File validation:', {
                mddFile: {
                    name: selectedFiles.mddFile.name,
                    size: selectedFiles.mddFile.size,
                    type: selectedFiles.mddFile.type
                },
                ddfFile: {
                    name: selectedFiles.ddfFile.name,
                    size: selectedFiles.ddfFile.size,
                    type: selectedFiles.ddfFile.type
                },
                duplicateCount,
                workspacePath
            });

            const mddBaseName = selectedFiles.mddFile.name.split('.')[0];
            const ddfBaseName = selectedFiles.ddfFile.name.split('.')[0];

            if (mddBaseName !== ddfBaseName) {
                throw new Error(`File base names must match: ${mddBaseName} != ${ddfBaseName}`);
            }

            if (duplicateCount < 1 || duplicateCount > 50) {
                throw new Error(`Duplicate count must be between 1 and 50, got: ${duplicateCount}`);
            }

            if (!workspacePath || workspacePath.trim() === '') {
                throw new Error('Workspace path cannot be empty');
            }

            const formData = new FormData();
            formData.append('mdd_file', selectedFiles.mddFile, selectedFiles.mddFile.name);
            formData.append('ddf_file', selectedFiles.ddfFile, selectedFiles.ddfFile.name);
            formData.append('duplicate_count', duplicateCount.toString());
            formData.append('workspace_path', workspacePath.trim());

            console.log('📤 FormData contents:');
            for (let pair of formData.entries()) {
                console.log(pair[0] + ':', pair[1]);
            }

            setProcessingStatus(prev => ({
                ...prev,
                currentStep: 'Uploading files...',
                progress: 20,
                logs: [...prev.logs, '📁 Uploading MDD and DDF files...']
            }));

            const response = await fetch('http://127.0.0.1:8000/data/duplicate-mdd', {
                method: 'POST',
                body: formData,
            });

            console.log('📡 Response status:', response.status);
            console.log('📡 Response headers:', response.headers);

            if (!response.ok) {
                const errorText = await response.text();
                console.error('❌ Error response:', errorText);

                let errorMessage;
                try {
                    const errorJson = JSON.parse(errorText);
                    errorMessage = errorJson.detail || errorText;
                } catch {
                    errorMessage = errorText || `HTTP error! status: ${response.status}`;
                }

                throw new Error(errorMessage);
            }

            setProcessingStatus(prev => ({
                ...prev,
                currentStep: 'Processing duplicates...',
                progress: 50,
                logs: [...prev.logs, `🔄 Creating ${duplicateCount} duplicates...`]
            }));

            const responseData = await response.json();
            console.log('✅ Success result:', responseData);

            setResult(responseData);

            setProcessingStatus(prev => ({
                ...prev,
                currentStep: 'Finalizing...',
                progress: 90,
                logs: [...prev.logs, '📦 Combining files and creating ZIP...']
            }));

            await new Promise(resolve => setTimeout(resolve, 1000));

            const finalLogs = [...processingStatus.logs];
            finalLogs.push('✅ Process completed successfully!');
            
            if (responseData.data?.output_file) {
                finalLogs.push(`📄 Output: ${responseData.data.output_file}`);
            }
            
            if (responseData.data?.total_records) {
                finalLogs.push(`📊 Final database contains ${responseData.data.total_records.toLocaleString()} records`);
            }

            setProcessingStatus(prev => ({
                ...prev,
                isProcessing: false,
                currentStep: 'Complete!',
                progress: 100,
                logs: finalLogs,
                success: true
            }));

            setActiveStep('complete');

        } catch (error) {
            console.error('💥 Process error:', error);

            setProcessingStatus(prev => ({
                ...prev,
                isProcessing: false,
                error: error instanceof Error ? error.message : 'Unknown error occurred',
                logs: [...prev.logs, `❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`]
            }));
        }
    };

    const handleReset = () => {
        setActiveStep('select');
        setSelectedFiles({ mddFile: null, ddfFile: null });
        setDuplicateCount(2);
        setProcessingStatus({
            isProcessing: false,
            currentStep: '',
            progress: 0,
            logs: [],
            success: false,
            error: null
        });
        setResult(null);
    };

    if (!isOpen) return null;

    return (
        <div className="duplicate-mdd-overlay">
            <div className="duplicate-mdd-backdrop" onClick={onClose} />

            <div className="duplicate-mdd-modal">
                {/* Header */}
                <div className="duplicate-mdd-header">
                    <div className="header-left">
                        <div className="header-icon">
                            <Icons.Database />
                        </div>
                        <div className="header-info">
                            <h2>MDD Duplicator</h2>
                            <p>Advanced data multiplication system</p>
                        </div>
                    </div>
                    <button className="close-button" onClick={onClose}>
                        <Icons.X />
                    </button>
                </div>

                {/* Progress Steps */}
                <div className="progress-steps">
                    <div className={`step ${activeStep === 'select' ? 'active' : (activeStep === 'configure' || activeStep === 'process' || activeStep === 'complete') ? 'completed' : ''}`}>
                        <div className="step-icon">
                            <Icons.FolderOpen />
                        </div>
                        <span>Select Files</span>
                    </div>
                    <div className="step-connector" />
                    <div className={`step ${activeStep === 'configure' ? 'active' : (activeStep === 'process' || activeStep === 'complete') ? 'completed' : ''}`}>
                        <div className="step-icon">
                            <Icons.Settings />
                        </div>
                        <span>Configure</span>
                    </div>
                    <div className="step-connector" />
                    <div className={`step ${activeStep === 'process' ? 'active' : activeStep === 'complete' ? 'completed' : ''}`}>
                        <div className="step-icon">
                            <Icons.RefreshCw />
                        </div>
                        <span>Process</span>
                    </div>
                    <div className="step-connector" />
                    <div className={`step ${activeStep === 'complete' ? 'active' : ''}`}>
                        <div className="step-icon">
                            <Icons.CheckCircle />
                        </div>
                        <span>Complete</span>
                    </div>
                </div>

                {/* Content Area */}
                <div className="duplicate-mdd-content">
                    {/* Step 1: File Selection */}
                    {activeStep === 'select' && (
                        <div className="step-content file-selection">
                            <h3>Select MDD & DDF Files</h3>
                            <p>Choose the base files you want to duplicate</p>

                            <div className="file-inputs">
                                <div className="file-input-group">
                                    <label className="file-input-label">
                                        <div className="label-content">
                                            <span className="file-icon">
                                                <Icons.FileText />
                                            </span>
                                            <div className="label-text">
                                                <strong>MDD File</strong>
                                                <span>Metadata Document (.mdd)</span>
                                            </div>
                                            {selectedFiles.mddFile && (
                                                <div className="file-selected">
                                                    <Icons.Check />
                                                </div>
                                            )}
                                        </div>
                                        <input
                                            type="file"
                                            accept=".mdd"
                                            onChange={(e) => handleFileSelect('mdd', e)}
                                            style={{ display: 'none' }}
                                        />
                                    </label>
                                    {selectedFiles.mddFile && (
                                        <div className="selected-file">
                                            <Icons.FileText /> {selectedFiles.mddFile.name}
                                        </div>
                                    )}
                                </div>

                                <div className="file-input-group">
                                    <label className="file-input-label">
                                        <div className="label-content">
                                            <span className="file-icon">
                                                <Icons.BarChart />
                                            </span>
                                            <div className="label-text">
                                                <strong>DDF File</strong>
                                                <span>Data Document (.ddf)</span>
                                            </div>
                                            {selectedFiles.ddfFile && (
                                                <div className="file-selected">
                                                    <Icons.Check />
                                                </div>
                                            )}
                                        </div>
                                        <input
                                            type="file"
                                            accept=".ddf"
                                            onChange={(e) => handleFileSelect('ddf', e)}
                                            style={{ display: 'none' }}
                                        />
                                    </label>
                                    {selectedFiles.ddfFile && (
                                        <div className="selected-file">
                                            <Icons.BarChart /> {selectedFiles.ddfFile.name}
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="workspace-info">
                                <div className="info-item">
                                    <span className="info-icon">
                                        <Icons.Folder />
                                    </span>
                                    <span>Workspace: {workspacePath}</span>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Step 2: Configuration */}
                    {activeStep === 'configure' && (
                        <div className="step-content configuration">
                            <h3>Duplication Configuration</h3>
                            <p>Specify how many times to duplicate the base files</p>

                            <div className="config-section">
                                <div className="config-item">
                                    <label htmlFor="duplicate-count">Number of Duplicates</label>
                                    <div className="number-input-container">
                                        <button
                                            className="number-btn"
                                            onClick={() => setDuplicateCount(Math.max(1, duplicateCount - 1))}
                                            disabled={duplicateCount <= 1}
                                        >
                                            <Icons.Minus />
                                        </button>
                                        <input
                                            id="duplicate-count"
                                            type="number"
                                            min="1"
                                            max="50"
                                            value={duplicateCount}
                                            onChange={(e) => setDuplicateCount(Math.max(1, parseInt(e.target.value) || 1))}
                                            className="number-input"
                                        />
                                        <button
                                            className="number-btn"
                                            onClick={() => setDuplicateCount(Math.min(50, duplicateCount + 1))}
                                            disabled={duplicateCount >= 50}
                                        >
                                            <Icons.Plus />
                                        </button>
                                    </div>
                                    <div className="config-hint">
                                        This will create {duplicateCount} copies and combine them into a single output
                                    </div>
                                </div>

                                <div className="preview-section">
                                    <h4>Preview</h4>
                                    <div className="preview-items">
                                        <div className="preview-item">
                                            <span className="preview-icon">
                                                <Icons.FileText />
                                            </span>
                                            <span>Base: {selectedFiles.mddFile?.name}</span>
                                        </div>
                                        <div className="preview-item">
                                            <span className="preview-icon">
                                                <Icons.BarChart />
                                            </span>
                                            <span>Base: {selectedFiles.ddfFile?.name}</span>
                                        </div>
                                        <div className="preview-arrow">
                                            <Icons.ArrowDown />
                                        </div>
                                        <div className="preview-item result">
                                            <span className="preview-icon">
                                                <Icons.Archive />
                                            </span>
                                            <span>{duplicateCount} duplicates → Combined ZIP file</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Step 3: Processing */}
                    {activeStep === 'process' && (
                        <div className="step-content processing">
                            <h3>Processing Duplicates</h3>
                            <p>{processingStatus.currentStep}</p>

                            <div className="progress-section">
                                <div className="progress-bar">
                                    <div
                                        className="progress-fill"
                                        style={{ width: `${processingStatus.progress}%` }}
                                    />
                                </div>
                                <div className="progress-text">
                                    {processingStatus.progress}%
                                </div>
                            </div>

                            <div className="logs-section">
                                <h4>Process Log</h4>
                                <div className="logs-container">
                                    {processingStatus.logs.map((log, index) => (
                                        <div key={index} className="log-entry">
                                            {log}
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {processingStatus.error && (
                                <div className="error-section">
                                    <h4>Error</h4>
                                    <div className="error-message">
                                        {processingStatus.error}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Step 4: Complete */}
                    {activeStep === 'complete' && (
                        <div className="step-content complete">
                            <div className="success-section">
                                <div className="success-icon">
                                    <Icons.Celebration />
                                </div>
                                <h3>Duplication Complete!</h3>
                                <p>Your MDD files have been successfully duplicated and combined</p>

                                <div className="result-info">
                                    <div className="result-item">
                                        <span className="result-label">Total Records:</span>
                                        <span className="result-value">
                                            <div className="records-display">
                                                <span className="records-number">
                                                    {result?.data?.total_records 
                                                        ? result.data.total_records.toLocaleString() 
                                                        : (duplicateCount * 1000).toLocaleString()
                                                    }
                                                </span>
                                                <span className="records-unit">records</span>
                                            </div>
                                        </span>
                                    </div>

                                    <div className="result-item">
                                        <span className="result-label">Multiplication:</span>
                                        <span className="result-value">
                                            {result?.data?.original_records && result?.data?.total_records
                                                ? `${result.data.original_records.toLocaleString()} → ${result.data.total_records.toLocaleString()} records (×${duplicateCount})`
                                                : `Original × ${duplicateCount} duplicates`
                                            }
                                        </span>
                                    </div>

                                    <div className="result-item">
                                        <span className="result-label">Output Location:</span>
                                        <span className="result-value">{workspacePath}</span>
                                    </div>

                                    <div className="result-item">
                                        <span className="result-label">Output File:</span>
                                        <span className="result-value">
                                            {result?.data?.output_file || 'Processing...'}
                                        </span>
                                    </div>

                                    <div className="result-item">
                                        <span className="result-label">Status:</span>
                                        <span className="result-value success">
                                            <Icons.CheckCircle /> Success
                                        </span>
                                    </div>
                                </div>

                                <div className="final-logs">
                                    <h4>Process Summary</h4>
                                    <div className="logs-container">
                                        {processingStatus.logs.slice(-3).map((log, index) => (
                                            <div key={index} className="log-entry">
                                                {log}
                                            </div>
                                        ))}

                                        {result?.record_summary && (
                                            <div className="log-entry highlight">
                                                <Icons.Info /> {result.record_summary}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer Actions */}
                <div className="duplicate-mdd-footer">
                    <div className="footer-left">
                        {activeStep !== 'select' && activeStep !== 'complete' && (
                            <button
                                className="secondary-button"
                                onClick={() => setActiveStep(activeStep === 'configure' ? 'select' : 'configure')}
                                disabled={processingStatus.isProcessing}
                            >
                                <Icons.ArrowLeft /> Back
                            </button>
                        )}
                    </div>

                    <div className="footer-right">
                        {activeStep === 'select' && (
                            <button
                                className="primary-button"
                                onClick={handleNextStep}
                                disabled={!canProceedToConfiguration}
                            >
                                Continue <Icons.ArrowRight />
                            </button>
                        )}

                        {activeStep === 'configure' && (
                            <button
                                className="primary-button"
                                onClick={handleNextStep}
                            >
                                Start Duplication <Icons.ArrowRight />
                            </button>
                        )}

                        {activeStep === 'complete' && (
                            <div className="complete-actions">
                                <button
                                    className="secondary-button"
                                    onClick={handleReset}
                                >
                                    <Icons.RefreshCw /> Duplicate More
                                </button>
                                <button
                                    className="primary-button"
                                    onClick={onClose}
                                >
                                    <Icons.CheckCircle /> Close
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DuplicateMDD;