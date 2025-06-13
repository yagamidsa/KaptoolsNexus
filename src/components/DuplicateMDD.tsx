// src/components/DuplicateMDD.tsx

import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { open } from '@tauri-apps/plugin-dialog';

interface DuplicateMDDProps {
    isOpen: boolean;
    onClose: () => void;
    workspacePath: string;
}

interface FileValidationResult {
    is_valid: boolean;
    mdd_exists: boolean;
    ddf_exists: boolean;
    mdd_path: string;
    ddf_path: string;
    error_message?: string;
    file_info?: {
        mdd_path: string;
        ddf_path: string;
        base_name: string;
        mdd_size: number;
        ddf_size: number;
        record_count?: number;
        is_valid: boolean;
    };
}

interface DuplicationResult {
    success: boolean;
    output_file_path: string;
    original_records: number;
    final_records: number;
    processing_time_seconds: number;
    output_file_size_mb: number;
    error_message?: string;
}

type ProcessingStep = 'idle' | 'configuring' | 'processing' | 'completed' | 'error';

const DuplicateMDD: React.FC<DuplicateMDDProps> = ({ isOpen, onClose, workspacePath }) => {
    // Estados principales
    const [currentStep, setCurrentStep] = useState<ProcessingStep>('idle');
    const [selectedFile, setSelectedFile] = useState<string>('');
    const [validationResult, setValidationResult] = useState<FileValidationResult | null>(null);
    const [duplicateCount, setDuplicateCount] = useState<number>(5);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string>('');

    // Estados de estimación
    const [estimatedSizeMB, setEstimatedSizeMB] = useState<number>(0);
    const [estimatedTimeSeconds, setEstimatedTimeSeconds] = useState<number>(0);

    // Estados de procesamiento
    const [processingProgress, setProcessingProgress] = useState<number>(0);
    const [currentProcessStep, setCurrentProcessStep] = useState<string>('');
    const [result, setResult] = useState<DuplicationResult | null>(null);

    // Opciones avanzadas
    const [includeValidation, setIncludeValidation] = useState(true);
    const [generateReport, setGenerateReport] = useState(true);
    const [autoOpenFolder, setAutoOpenFolder] = useState(true);

    // Reset states when modal closes
    useEffect(() => {
        if (!isOpen) {
            resetStates();
        }
    }, [isOpen]);

    const resetStates = () => {
        setCurrentStep('idle');
        setSelectedFile('');
        setValidationResult(null);
        setDuplicateCount(5);
        setLoading(false);
        setError('');
        setEstimatedSizeMB(0);
        setEstimatedTimeSeconds(0);
        setProcessingProgress(0);
        setCurrentProcessStep('');
        setResult(null);
    };

    // Seleccionar archivo MDD
    const handleFileSelect = async () => {
        try {
            setLoading(true);
            setError('');

            const selected = await open({
                title: 'Select MDD File',
                filters: [
                    {
                        name: 'MDD Files',
                        extensions: ['mdd']
                    }
                ]
            });

            if (selected && typeof selected === 'string') {
                setSelectedFile(selected);
                await validateFile(selected);
            }
        } catch (err) {
            setError(`Failed to select file: ${err}`);
            console.error('File selection error:', err);
        } finally {
            setLoading(false);
        }
    };

    // Validar archivo seleccionado
    const validateFile = async (filePath: string) => {
        try {
            setLoading(true);
            console.log('🔍 Validating file:', filePath);

            const validation: FileValidationResult = await invoke('validate_mdd_file', {
                filePath: filePath
            });

            setValidationResult(validation);

            if (validation.is_valid) {
                setCurrentStep('configuring');
                await updateEstimations();
            } else {
                setError(validation.error_message || 'File validation failed');
                setCurrentStep('error');
            }
        } catch (err) {
            setError(`Validation failed: ${err}`);
            setCurrentStep('error');
            console.error('Validation error:', err);
        } finally {
            setLoading(false);
        }
    };

    // Actualizar estimaciones cuando cambia el count
    const updateEstimations = async () => {
        if (!selectedFile) return;

        try {
            const [sizeMB, timeSeconds]: [number, number] = await invoke('estimate_duplication_resources', {
                filePath: selectedFile,
                duplicateCount: duplicateCount
            });

            setEstimatedSizeMB(sizeMB);
            setEstimatedTimeSeconds(timeSeconds);
        } catch (err) {
            console.error('Estimation error:', err);
        }
    };

    // Actualizar estimaciones cuando cambia duplicate count
    useEffect(() => {
        if (currentStep === 'configuring' && selectedFile) {
            updateEstimations();
        }
    }, [duplicateCount, selectedFile, currentStep]);

    // Iniciar procesamiento
    const startProcessing = async () => {
        if (!selectedFile || !validationResult?.is_valid) return;

        try {
            setCurrentStep('processing');
            setProcessingProgress(0);
            setCurrentProcessStep('Initializing duplication process...');

            // Simular progress (TODO: implementar progress real)
            const progressInterval = setInterval(() => {
                setProcessingProgress(prev => {
                    if (prev >= 90) {
                        clearInterval(progressInterval);
                        return 90;
                    }
                    return prev + Math.random() * 15;
                });
            }, 500);

            const request = {
                mdd_file_path: selectedFile,
                duplicate_count: duplicateCount,
                workspace_path: workspacePath,
                options: {
                    include_metadata_validation: includeValidation,
                    generate_verification_report: generateReport,
                    auto_open_result_folder: autoOpenFolder,
                    keep_temp_files: false
                }
            };

            const processingResult: DuplicationResult = await invoke('duplicate_mdd_files', {
                request: request
            });

            clearInterval(progressInterval);
            setProcessingProgress(100);

            if (processingResult.success) {
                setResult(processingResult);
                setCurrentStep('completed');
            } else {
                setError(processingResult.error_message || 'Processing failed');
                setCurrentStep('error');
            }
        } catch (err) {
            setError(`Processing failed: ${err}`);
            setCurrentStep('error');
            console.error('Processing error:', err);
        }
    };

    // Formatear tiempo
    const formatTime = (seconds: number): string => {
        if (seconds < 60) return `~${seconds} seconds`;
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        return `~${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    };

    // Formatear tamaño
    const formatSize = (sizeMB: number): string => {
        if (sizeMB < 1024) return `~${sizeMB.toFixed(1)} MB`;
        const sizeGB = sizeMB / 1024;
        return `~${sizeGB.toFixed(2)} GB`;
    };

    if (!isOpen) return null;

    return (
        <div className="modal-overlay">
            <div className="modal-content duplicate-mdd-modal">
                {/* Header */}
                <div className="modal-header">
                    <div className="header-icon">🔥</div>
                    <h2>DUPLICATE MDD PROCESSOR</h2>
                    <button className="close-button" onClick={onClose}>
                        ❌
                    </button>
                </div>

                <div className="modal-body">
                    {/* File Selection Section */}
                    {currentStep === 'idle' && (
                        <div className="section file-selection">
                            <div className="section-title">
                                <span className="section-icon">📂</span>
                                Source File Selection
                            </div>

                            <div className="file-input-container">
                                <div className="file-display">
                                    {selectedFile ? (
                                        <span className="file-path">{selectedFile}</span>
                                    ) : (
                                        <span className="file-placeholder">📁 No file selected...</span>
                                    )}
                                </div>
                                <button
                                    className="file-browse-btn"
                                    onClick={handleFileSelect}
                                    disabled={loading}
                                >
                                    {loading ? '🔄' : '📁'} Browse Files
                                </button>
                            </div>

                            {error && (
                                <div className="error-message">
                                    ❌ {error}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Configuration Section */}
                    {currentStep === 'configuring' && validationResult && (
                        <>
                            <div className="section file-info">
                                <div className="section-title">
                                    <span className="section-icon">✅</span>
                                    File Validation Results
                                </div>

                                <div className="file-details">
                                    <div className="file-item">
                                        <span className="file-label">MDD File:</span>
                                        <span className="file-value">{validationResult.file_info?.base_name}.mdd</span>
                                    </div>
                                    <div className="file-item">
                                        <span className="file-label">DDF File:</span>
                                        <span className="file-value">✅ Auto-detected</span>
                                    </div>
                                    <div className="file-item">
                                        <span className="file-label">Total Size:</span>
                                        <span className="file-value">
                                            {formatSize(((validationResult.file_info?.mdd_size || 0) + (validationResult.file_info?.ddf_size || 0)) / 1048576)}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div className="section duplication-settings">
                                <div className="section-title">
                                    <span className="section-icon">🔢</span>
                                    Duplication Settings
                                </div>

                                <div className="settings-grid">
                                    <div className="setting-item">
                                        <label htmlFor="duplicate-count">Number of duplicates:</label>
                                        <div className="count-input-container">
                                            <input
                                                id="duplicate-count"
                                                type="number"
                                                value={duplicateCount}
                                                onChange={(e) => setDuplicateCount(parseInt(e.target.value) || 1)}
                                                min="1"
                                                max="100"
                                                className="count-input"
                                            />
                                            <span className="count-icon">🔄</span>
                                        </div>
                                    </div>

                                    <div className="estimations">
                                        <div className="estimation-item">
                                            <span className="estimation-label">⚡ Estimated time:</span>
                                            <span className="estimation-value">{formatTime(estimatedTimeSeconds)}</span>
                                        </div>
                                        <div className="estimation-item">
                                            <span className="estimation-label">💾 Output size:</span>
                                            <span className="estimation-value">{formatSize(estimatedSizeMB)}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="section processing-options">
                                <div className="section-title">
                                    <span className="section-icon">🎯</span>
                                    Processing Options
                                </div>

                                <div className="options-grid">
                                    <label className="option-checkbox">
                                        <input
                                            type="checkbox"
                                            checked={includeValidation}
                                            onChange={(e) => setIncludeValidation(e.target.checked)}
                                        />
                                        <span className="checkmark">☑️</span>
                                        Include metadata validation
                                    </label>

                                    <label className="option-checkbox">
                                        <input
                                            type="checkbox"
                                            checked={generateReport}
                                            onChange={(e) => setGenerateReport(e.target.checked)}
                                        />
                                        <span className="checkmark">☑️</span>
                                        Generate verification report
                                    </label>

                                    <label className="option-checkbox">
                                        <input
                                            type="checkbox"
                                            checked={autoOpenFolder}
                                            onChange={(e) => setAutoOpenFolder(e.target.checked)}
                                        />
                                        <span className="checkmark">☑️</span>
                                        Auto-open result folder
                                    </label>
                                </div>
                            </div>
                        </>
                    )}

                    {/* Processing Section */}
                    {currentStep === 'processing' && (
                        <div className="section processing-status">
                            <div className="section-title">
                                <span className="section-icon">⚡</span>
                                PROCESSING: DUPLICATE MDD
                            </div>

                            <div className="progress-container">
                                <div className="progress-info">
                                    <span className="progress-label">📊 Progress: {Math.round(processingProgress)}% Complete</span>
                                </div>

                                <div className="progress-bar-container">
                                    <div
                                        className="progress-bar"
                                        style={{ width: `${processingProgress}%` }}
                                    ></div>
                                </div>

                                <div className="processing-details">
                                    <div className="detail-item">
                                        <span className="detail-label">🔄 Current Step:</span>
                                        <span className="detail-value">{currentProcessStep}</span>
                                    </div>
                                    <div className="detail-item">
                                        <span className="detail-label">⏱️ Estimated remaining:</span>
                                        <span className="detail-value">
                                            {formatTime(Math.round((estimatedTimeSeconds * (100 - processingProgress)) / 100))}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Completed Section */}
                    {currentStep === 'completed' && result && (
                        <div className="section completion-status">
                            <div className="section-title">
                                <span className="section-icon">✅</span>
                                PROCESSING COMPLETE
                            </div>

                            <div className="completion-message">
                                🎉 Successfully duplicated MDD file!
                            </div>

                            <div className="results-grid">
                                <div className="result-item">
                                    <span className="result-label">• Original records:</span>
                                    <span className="result-value">{result.original_records.toLocaleString()}</span>
                                </div>
                                <div className="result-item">
                                    <span className="result-label">• Duplicated {duplicateCount}x:</span>
                                    <span className="result-value">{result.final_records.toLocaleString()} total records</span>
                                </div>
                                <div className="result-item">
                                    <span className="result-label">• Processing time:</span>
                                    <span className="result-value">{formatTime(result.processing_time_seconds)}</span>
                                </div>
                                <div className="result-item">
                                    <span className="result-label">• Output file:</span>
                                    <span className="result-value">{result.output_file_path.split('/').pop()}</span>
                                </div>
                            </div>

                            <div className="output-location">
                                <div className="location-label">📂 Output Location:</div>
                                <div className="location-path">{result.output_file_path}</div>
                            </div>
                        </div>
                    )}

                    {/* Error Section */}
                    {currentStep === 'error' && (
                        <div className="section error-status">
                            <div className="section-title">
                                <span className="section-icon">❌</span>
                                PROCESSING ERROR
                            </div>

                            <div className="error-message">
                                {error}
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer Actions */}
                <div className="modal-footer">
                    {currentStep === 'idle' && (
                        <button className="modal-button secondary" onClick={onClose}>
                            ❌ Cancel
                        </button>
                    )}

                    {currentStep === 'configuring' && (
                        <>
                            <button className="modal-button secondary" onClick={() => setCurrentStep('idle')}>
                                ⬅️ Back
                            </button>
                            <button
                                className="modal-button primary"
                                onClick={startProcessing}
                                disabled={loading}
                            >
                                🚀 Start Processing
                            </button>
                        </>
                    )}

                    {currentStep === 'processing' && (
                        <button className="modal-button danger">
                            🛑 Stop
                        </button>
                    )}

                    {(currentStep === 'completed' || currentStep === 'error') && (
                        <button className="modal-button primary" onClick={onClose}>
                            ✅ Done
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default DuplicateMDD;