import React, { useState, useRef } from 'react';
import './Modal.css';

interface QChunksProcessorProps {
    isOpen: boolean;
    onClose: () => void;
    workspacePath: string;
}

interface ProcessingResult {
    variable_name: string;
    line_index: number;
    chunks_found: number;
    existing_files?: string[];
    status: string;
}

interface ProcessingStats {
    dimvar_count: number;
    insertions_made: number;
    skipped_no_files: number;
    original_size: number;
    processed_size: number;
}

interface EncodingInfo {
    original_encoding: string;
    output_encoding: string;
    note: string;
}

interface BackendResponse {
    success: boolean;
    message: string;
    original_filename: string;
    processed_content: string;
    encoding_info?: EncodingInfo;
    stats: ProcessingStats;
    processing_results: ProcessingResult[];
}

const QChunksProcessor: React.FC<QChunksProcessorProps> = ({ isOpen, onClose, workspacePath }) => {
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [processing, setProcessing] = useState(false);
    const [result, setResult] = useState<BackendResponse | null>(null);
    const [error, setError] = useState('');
    const [processingProgress, setProcessingProgress] = useState(0);

    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file && file.name.endsWith('.odin')) {
            setSelectedFile(file);
            setError('');
            setResult(null);
        } else {
            setError('Please select a valid .odin file');
        }
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        const files = e.dataTransfer.files;
        if (files.length > 0 && files[0].name.endsWith('.odin')) {
            setSelectedFile(files[0]);
            setError('');
            setResult(null);
        }
    };

    const processFile = async () => {
        if (!selectedFile) return;

        setProcessing(true);
        setError('');
        setResult(null);
        setProcessingProgress(0);

        try {

            const progressInterval = setInterval(() => {
                setProcessingProgress(prev => {
                    if (prev >= 90) return prev;
                    return prev + Math.random() * 15;
                });
            }, 200);

            const formData = new FormData();
            formData.append('odin_file', selectedFile);
            formData.append('workspace_path', workspacePath);

            console.log('🚀 Sending to backend:', {
                filename: selectedFile.name,
                workspace: workspacePath
            });

            const response = await fetch('http://127.0.0.1:8000/odin-chunks/process-file', {
                method: 'POST',
                body: formData
            });

            clearInterval(progressInterval);

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Backend error (${response.status}): ${errorText}`);
            }

            const data: BackendResponse = await response.json();

            if (data.success) {
                
                setProcessingProgress(100);

                
                setTimeout(() => {
                    setResult(data);
                    console.log('✅ Processing successful:', data.message);
                }, 500);
            } else {
                throw new Error(data.message || 'Processing failed');
            }

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            console.error('💥 Processing error:', errorMessage);
            setError(errorMessage);
        } finally {
            setProcessing(false);
            setProcessingProgress(0); 
        }
    };

    const downloadProcessedFile = () => {
        if (!result || !result.processed_content || !selectedFile) return;

        
        let blob;
        let filename = selectedFile.name.replace('.odin', '_processed.odin');

        
        const hasValidEncodingInfo = result.encoding_info &&
            result.encoding_info.output_encoding !== undefined;

        const isUtf16Output = hasValidEncodingInfo &&
            result.encoding_info!.output_encoding === "UTF-16 LE with BOM";

        if (isUtf16Output) {
            
            const utf16Content = new TextEncoder().encode('\ufeff' + result.processed_content);
            blob = new Blob([utf16Content], { type: 'text/plain;charset=utf-16le' });
            console.log('📄 Saving as UTF-16 LE with BOM');
        } else {
            
            blob = new Blob([result.processed_content], { type: 'text/plain;charset=utf-8' });
            console.log('📄 Saving as UTF-8');
        }

        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        
        const encodingInfo = hasValidEncodingInfo ?
            result.encoding_info!.output_encoding :
            'UTF-8';

        console.log('Downloaded: ' + filename + ' (' + encodingInfo + ')');
    };

    const handleClose = () => {
        setSelectedFile(null);
        setResult(null);
        setError('');
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && handleClose()}>
            <div className="modal-container large">
                <div className="modal-header">
                    <div className="modal-title">
                        <span className="modal-icon">⚙️</span>
                        <h2>ODIN Chunks Processor</h2>
                    </div>
                    <button onClick={handleClose} className="modal-close">✕</button>
                </div>

                <div className="modal-content">
                    {/* File Upload Section */}
                    <div className="upload-section">
                        <div
                            className={`upload-area ${selectedFile ? 'has-file' : ''}`}
                            onDragOver={handleDragOver}
                            onDrop={handleDrop}
                            onClick={() => fileInputRef.current?.click()}
                        >
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept=".odin"
                                onChange={handleFileSelect}
                                style={{ display: 'none' }}
                            />

                            {selectedFile ? (
                                <div className="file-selected">
                                    <div className="file-icon">📄</div>
                                    <div className="file-info">
                                        <div className="file-name">{selectedFile.name}</div>
                                        <div className="file-size">{(selectedFile.size / 1024).toFixed(2)} KB</div>
                                    </div>
                                </div>
                            ) : (
                                <div className="upload-prompt">
                                    <div className="upload-icon">📂</div>
                                    <div className="upload-text">
                                        <strong>Select .odin File</strong>
                                        <p>Drag and drop or click to browse</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Workspace Info */}
                    <div className="workspace-info">
                        <div className="info-item">
                            <span className="info-label">📁 Workspace:</span>
                            <span className="info-value">{workspacePath}</span>
                        </div>
                        <div className="info-item">
                            <span className="info-label">🎯 Target:</span>
                            <span className="info-value">outputs-dimensions-content\Template_Chunks</span>
                        </div>
                    </div>

                    {/* Process Button */}
                    {!processing ? (
                        <button
                            className={`process-button ${!selectedFile ? 'disabled' : ''}`}
                            onClick={processFile}
                            disabled={!selectedFile}
                        >
                            ⚡ Process ODIN File (Backend)
                        </button>
                    ) : (
                        
                        <div className="circular-progress-container processing">
                            
                            <svg className="progress-gradient-defs" xmlns="http://www.w3.org/2000/svg">
                                <defs>
                                    <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                                        <stop offset="0%" style={{ stopColor: '#6c5ce7', stopOpacity: 1 }} />
                                        <stop offset="100%" style={{ stopColor: '#ff6b9d', stopOpacity: 1 }} />
                                    </linearGradient>
                                </defs>
                            </svg>

                            
                            <div style={{ position: 'relative' }}>
                                <svg className="circular-progress-svg" xmlns="http://www.w3.org/2000/svg">
                                    <circle className="progress-circle-bg" cx="60" cy="60" r="50" />
                                    <circle className="progress-circle-inner" cx="60" cy="60" r="40" />
                                    <circle
                                        className="progress-circle-fill"
                                        cx="60"
                                        cy="60"
                                        r="50"
                                        style={{
                                            strokeDashoffset: `calc(314 - (314 * ${processingProgress}) / 100)`
                                        }}
                                    />
                                </svg>

                                
                                <div className="progress-text-overlay">
                                    <div className="progress-percentage">{Math.round(processingProgress)}%</div>
                                    <div className="progress-label">Processing</div>
                                </div>
                            </div>

                            
                            <div className="progress-info-text">
                                Processing ODIN file via backend...
                            </div>
                        </div>
                    )}

                    {/* Error Message */}
                    {error && (
                        <div className="error-message">
                            <span className="error-icon">❌</span>
                            {error}
                        </div>
                    )}

                    {/* Results Section */}
                    {result && (
                        <div className="results-section">
                            {/* Success Message */}
                            <div className="success-message">

                                {result.message}
                            </div>

                            {result.encoding_info && (
                                <div className="encoding-info">
                                    <h4>📝 Encoding Information</h4>
                                    <div className="encoding-details">
                                        <div className="encoding-item">
                                            <span className="encoding-label">Original:</span>
                                            <span className="encoding-value">{result.encoding_info.original_encoding}</span>
                                        </div>
                                        <div className="encoding-item">
                                            <span className="encoding-label">Output:</span>
                                            <span className="encoding-value">{result.encoding_info.output_encoding}</span>
                                        </div>
                                        <div className="encoding-note">
                                            💡 {result.encoding_info.note}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Stats */}
                            {result.stats && (
                                <div className="stats-grid">
                                    <div className="stat-card">
                                        <div className="stat-value">{result.stats.dimvar_count}</div>
                                        <div className="stat-label">DIMVAR Variables</div>
                                    </div>
                                    <div className="stat-card">
                                        <div className="stat-value">{result.stats.insertions_made}</div>
                                        <div className="stat-label">Chunks Inserted</div>
                                    </div>
                                    <div className="stat-card">
                                        <div className="stat-value">{result.stats.skipped_no_files}</div>
                                        <div className="stat-label">Skipped (No Files)</div>
                                    </div>
                                    <div className="stat-card">
                                        <div className="stat-value">{(result.stats.processed_size / 1024).toFixed(2)} KB</div>
                                        <div className="stat-label">Output Size</div>
                                    </div>
                                </div>
                            )}

                            {/* Processing Results Details */}
                            {result.processing_results && result.processing_results.length > 0 && (
                                <div className="processing-results">
                                    <h4>📋 Processing Details</h4>
                                    <div className="results-table">
                                        {result.processing_results.map((processResult, index) => (
                                            <div key={index} className={`result-row ${processResult.status.includes('SUCCESS') ? 'success' : processResult.status.includes('SKIPPED') ? 'warning' : 'error'}`}>
                                                <div className="result-variable">
                                                    <strong>{processResult.variable_name}</strong>
                                                </div>
                                                <div className="result-status">
                                                    {processResult.chunks_found > 0 ? (
                                                        <>
                                                            <span className="chunks-count">📦 {processResult.chunks_found} chunks</span>
                                                            <span className="status-text">{processResult.status}</span>
                                                        </>
                                                    ) : (
                                                        <span className="status-text">{processResult.status}</span>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Output Preview and Download */}
                            {result.processed_content && (
                                <div className="output-section">
                                    <div className="output-header">
                                        <h4>📄 Processed File Preview</h4>
                                        <button
                                            className="download-button"
                                            onClick={downloadProcessedFile}
                                        >
                                            💾 Download Processed File
                                        </button>
                                    </div>
                                    <div className="output-content">
                                        <pre>{result.processed_content.substring(0, 2000)}{result.processed_content.length > 2000 ? '\n... (truncated for display)' : ''}</pre>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default QChunksProcessor;