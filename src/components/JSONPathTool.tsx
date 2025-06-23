import React, { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import JsonViewer from './JsonViewer.tsx';
import './JSONPathTool.css';

// Componente de iconos
const Icon: React.FC<{ emoji: string; size?: number; className?: string }> = ({
    emoji,
    size = 16,
    className = ""
}) => (
    <span className={className} style={{ fontSize: `${size}px`, lineHeight: 1 }}>
        {emoji}
    </span>
);

// Interfaces para tipos de datos
interface Environment {
    key: string;
    name: string;
    prefix: string;
}

interface ServiceConfig {
    name: string;
    base_url: string;
    templates: Array<{
        name: string;
        pattern: string;
        example: string;
        description: string;
    }>;
}

interface ApiResponse {
    success: boolean;
    raw_response?: string;
    jsonpath_result?: string;
    error?: string;
    url_used: string;
    execution_time_ms: number;
}

// 🔥 INTERFAZ CON onClose
interface JSONPathToolProps {
    onClose: () => void;
}

// 🔥 COMPONENTE ACTUALIZADO CON TODOS LOS ENDPOINTS
const JSONPathTool: React.FC<JSONPathToolProps> = ({ onClose }) => {
    const [environment, setEnvironment] = useState<string>('sandbox3');
    const [selectedService, setSelectedService] = useState<string>('study-definition');
    const [endpoint, setEndpoint] = useState<string>('/health');
    const [token, setToken] = useState<string>('');
    const [jsonPathQuery, setJsonPathQuery] = useState<string>('$');
    const [showToken, setShowToken] = useState<boolean>(false);
    const [apiResponse, setApiResponse] = useState<string>('');
    const [jsonPathResult, setJsonPathResult] = useState<string>('');
    const [message, setMessage] = useState<string>('Ready to make real API requests');
    const [isLoading, setIsLoading] = useState<boolean>(false);

    // 🔥 CONFIGURACIÓN FIJA - Solo Sandbox 3
    const availableEnvironments: Environment[] = [
        { key: 'sandbox3', name: 'Sandbox 3', prefix: 'sandbox3-' }
    ];

    // 🔥 TODOS LOS ENDPOINTS GET DEL OPENAPI
    const availableServices: Record<string, ServiceConfig> = {
        'study-definition': {
            name: 'Study Definition',
            base_url: 'studydef.azurewebsites.net',
            templates: [
                // === BASIC SERVICE ENDPOINTS ===
                {
                    name: 'Health Check',
                    pattern: '/health',
                    example: '/health',
                    description: '🏥 Check service health status'
                },
                // === PROJECT ENDPOINTS ===
                {
                    name: 'Check Project Exists',
                    pattern: '/Projects/{projectId}/exists',
                    example: '/Projects/PROJECTID/exists',
                    description: '✅ Check if project exists and can be read by user'
                },
                {
                    name: 'Get Project Details',
                    pattern: '/Projects/{projectId}',
                    example: '/Projects/PROJECTID',
                    description: '📄 Get project by ID with studies, waves and modules'
                },
                {
                    name: 'Get Short Project',
                    pattern: '/shortprojects/{projectId}',
                    example: '/shortprojects/PROJECTID',
                    description: '📋 Get short project object with studies, waves and modules'
                },
                {
                    name: 'Get Project Users',
                    pattern: '/Projects/{projectId}/users',
                    example: '/Projects/PROJECTID/users',
                    description: '👥 Get all users assigned to a project'
                },
                {
                    name: 'Get Studies for Navigation',
                    pattern: '/projects/{projectId}/studies/navigationv2',
                    example: '/projects/PROJECTID/studies/navigationv2',
                    description: '🗺️ Get studies and waves for navigation'
                },
                {
                    name: 'Get Ready-to-Use Shells',
                    pattern: '/Projects/ReadyToUseShells',
                    example: '/Projects/ReadyToUseShells',
                    description: '🐚 Get available shell count for projects'
                },

                // === STUDY ENDPOINTS ===
                {
                    name: 'Check Study Exists',
                    pattern: '/studies/{studyId}/exists',
                    example: '/studies/KAPID/exists',
                    description: '✅ Check if study exists and can be read by user'
                },
                {
                    name: 'Get Study by ID',
                    pattern: '/studies/{study_id}',
                    example: '/studies/KAPID',
                    description: '📄 Get study by ID without project context'
                },
                {
                    name: 'Get Study with Project',
                    pattern: '/projects/{project_id}/studies/{study_id}',
                    example: '/projects/PROJECTID/studies/KAPID',
                    description: '📋 Get study by ID within project context'
                },
                {
                    name: 'Get All Studies for Project',
                    pattern: '/Projects/{project_id}/studies',
                    example: '/Projects/PROJECTID/studies',
                    description: '📚 Get all studies for a specific project'
                },
                {
                    name: 'Get Study Languages',
                    pattern: '/Projects/{project_id}/studies/{study_id}/languages',
                    example: '/Projects/PROJECTID/studies/KAPID/languages',
                    description: '🌍 Get all languages available for a study'
                },
                {
                    name: 'Get Study Simple Settings',
                    pattern: '/studies/{study_id}/simple_settings',
                    example: '/studies/KAPID/simple_settings',
                    description: '🔧 Get all simple settings for a study'
                },
                {
                    name: 'Get Study Master Property',
                    pattern: '/studies/{study_id}/master_property/{property_value}',
                    example: '/studies/KAPID/master_property/{property_value}',
                    description: '🏷️ Get master properties by study'
                },
                {
                    name: 'Get Simple Settings by Product Type',
                    pattern: '/projects/{project_id}/simple_settings_meta/{product_type_id}',
                    example: '/projects/PROJECTID/simple_settings_meta/{product_type_id}',
                    description: '📋 Get simple settings metadata by product type'
                },

                // === WAVE ENDPOINTS ===
                {
                    name: 'Check Wave Exists',
                    pattern: '/waves/{waveID}/exists',
                    example: '/waves/WAVEID/exists',
                    description: '✅ Check if wave exists and can be read by user'
                },
                {
                    name: 'Get Wave Details',
                    pattern: '/waves/{wave_id}',
                    example: '/waves/WAVEID',
                    description: '📄 Get complete wave data by wave ID'
                },
                {
                    name: 'Get Short Wave',
                    pattern: '/waves/{wave_id}/shortwave',
                    example: '/waves/WAVEID/shortwave',
                    description: '📋 Get short wave details'
                },
                {
                    name: 'Get Waves for Study',
                    pattern: '/projects/{project_id}/studies/{study_id}/waves',
                    example: '/projects/PROJECTID/studies/KAPID/waves',
                    description: '📊 Get all waves for a specific study'
                },
                {
                    name: 'Get Wave Simple Settings',
                    pattern: '/waves/{wave_id}/simple_settings',
                    example: '/waves/WAVEID/simple_settings',
                    description: '⚙️ Get all simple settings for a wave'
                },
                {
                    name: 'Get Wave Flag by Name',
                    pattern: '/waves/{wave_id}/flags/{flag_name}',
                    example: '/waves/WAVEID/flags/{flag_name}',
                    description: '🏷️ Get wave flag status by name'
                },
                {
                    name: 'Get Wave Study Creation Objects',
                    pattern: '/waves/{wave_id}/GetObjectsForStudyCreation',
                    example: '/waves/WAVEID/GetObjectsForStudyCreation',
                    description: '🏗️ Get objects needed for study creation'
                },
                {
                    name: 'Get Scripting Package Location',
                    pattern: '/waves/{wave_id}/scripting-package-location',
                    example: '/waves/WAVEID/scripting-package-location',
                    description: '📦 Get URL to download scripting package'
                },
                {
                    name: 'Get Wave Simple Settings Metadata (Tesseract)',
                    pattern: '/tesseract/waves/{wave_id}/simple_settings_meta',
                    example: '/tesseract/waves/WAVEID/simple_settings_meta',
                    description: '🔧 Get simple setting metadata for wave using Tesseract'
                },
                {
                    name: 'Get Wave Master Property (Tesseract)',
                    pattern: '/tesseract/waves/{wave_id}/master_property/{property_value}',
                    example: '/tesseract/waves/WAVEID/master_property/{property_value}',
                    description: '🏷️ Get master properties by wave using Tesseract'
                },

                // === MISCELLANEOUS ENDPOINTS ===
                {
                    name: 'Get List Source Items',
                    pattern: '/lists_source/{list}',
                    example: '/lists_source/{list}',
                    description: '📋 Get list of list source items by type'
                },
                {
                    name: 'Get All List Sources',
                    pattern: '/lists_source',
                    example: '/lists_source',
                    description: '📚 Get all list source items (legacy mode)'
                },
                {
                    name: 'Get Tesseract List Source',
                    pattern: '/tesseract/lists_source/{list}',
                    example: '/tesseract/lists_source/countries?productId=PROD123',
                    description: '🔧 Get Tesseract list source items'
                },
                {
                    name: 'Get All Tesseract List Sources',
                    pattern: '/tesseract/lists_source',
                    example: '/tesseract/lists_source?productId=PROD123',
                    description: '🔧 Get all Tesseract list source items'
                },
                {
                    name: 'Check Country Incidence Threshold',
                    pattern: '/country-incidence-threshold/{cdh_country_id}',
                    example: '/country-incidence-threshold/US',
                    description: '📊 Check incidence rate threshold for country'
                },
                {
                    name: 'Check Country Incidence Threshold (Tesseract)',
                    pattern: '/tesseract/country-incidence-threshold/{cdh_country_id}',
                    example: '/tesseract/country-incidence-threshold/US?productId=PROD123',
                    description: '🔧 Check incidence rate threshold using Tesseract'
                },
                {
                    name: 'Get Product Clients (Tesseract)',
                    pattern: '/tesseract/product_clients/{product_type_id}',
                    example: '/tesseract/product_clients/PROD_TYPE_01',
                    description: '👥 Get clients by product type using Tesseract'
                },
                {
                    name: 'Get Simple Settings by Product & Locale (Tesseract)',
                    pattern: '/tesseract/simple_settings_meta/{product_type_id}',
                    example: '/tesseract/simple_settings_meta/PROD_TYPE_01?locale=en-US',
                    description: '🌍 Get simple settings by product type and locale'
                },

                // === TESSERACT ENDPOINTS ===
                {
                    name: 'Get Study Master Property (Tesseract)',
                    pattern: '/tesseract/studies/{study_id}/master_property/{property_value}',
                    example: '/tesseract/studies/KAPID/master_property/client_name',
                    description: '🔧 Get study master properties using Tesseract'
                },
                {
                    name: 'Get Study Simple Settings Metadata (Tesseract)',
                    pattern: '/tesseract/studies/{study_id}/simple_settings_meta',
                    example: '/tesseract/studies/KAPID/simple_settings_meta',
                    description: '⚙️ Get study simple settings metadata using Tesseract'
                },
                {
                    name: 'Get Simple Settings by Product Type (Tesseract)',
                    pattern: '/tesseract/projects/{project_id}/simple_settings_meta/{product_type_id}',
                    example: '/tesseract/projects/PROJECTID/simple_settings_meta/PROD_TYPE_01',
                    description: '📋 Get simple settings by product type using Tesseract'
                }
            ]
        },
        'questionnaire-factory': {
            name: 'Questionnaire Factory',
            base_url: 'kap-qfactory.azurewebsites.net',
            templates: [
                // === MISC MODULES ===
                {
                    name: 'Health Check',
                    pattern: '/health',
                    example: '/health',
                    description: '🏥 Returns the current status of this service'
                },
                {
                    name: 'Version Info',
                    pattern: '/version',
                    example: '/version',
                    description: '📋 Returns the current version of this service'
                },
                {
                    name: 'Environment Variables',
                    pattern: '/environment',
                    example: '/environment',
                    description: '🌍 Returns the environment variables'
                },

                // === WAVE API MODULE ===
                {
                    name: 'Wave All Questions',
                    pattern: '/waves/{wave_id}/all-questions',
                    example: '/waves/W123456/all-questions',
                    description: '❓ Returns all the wave questions'
                },
                {
                    name: 'Wave Selected Questions',
                    pattern: '/waves/{wave_id}/questions',
                    example: '/waves/W123456/questions',
                    description: '✅ Returns selected questions for a wave'
                },
                {
                    name: 'Wave Text Replacements',
                    pattern: '/waves/{wave_id}/text_replacements',
                    example: '/waves/W123456/text_replacements',
                    description: '📝 Returns text replacements for a wave'
                },
                {
                    name: 'Wave Modules',
                    pattern: '/waves/{wave_id}/modules',
                    example: '/waves/W123456/modules',
                    description: '🧩 Returns modules for a wave'
                },
                {
                    name: 'Wave Quotas',
                    pattern: '/waves/{wave_id}/quotas',
                    example: '/waves/W123456/quotas',
                    description: '📊 Returns quota definitions for a wave'
                },
                {
                    name: 'Wave Qlib Content',
                    pattern: '/waves/{wave_id}/qlibcontent',
                    example: '/waves/W123456/qlibcontent',
                    description: '📚 Returns the qlib content for a wave'
                },
                {
                    name: 'Wave Details',
                    pattern: '/waves/{wave_id}/qf',
                    example: '/waves/W123456/qf',
                    description: '📄 Returns all the details for a wave'
                },

                // === PRODUCT TEMPLATE MODULE ===
                {
                    name: 'Product Templates List',
                    pattern: '/producttemplateslist',
                    example: '/producttemplateslist',
                    description: '📋 Returns the complete product templates list'
                },
                {
                    name: 'Product Template by ID',
                    pattern: '/producttemplates/{qlib_producttemplate_id}',
                    example: '/producttemplates/TEMPLATE123?languages=en',
                    description: '🏭 Returns a Product Template by ID'
                }
            ]
        }
    };

    // 🔥 EFECTO PARA CERRAR CON ESC
    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                onClose();
            }
        };

        document.addEventListener('keydown', handleEscape);
        return () => document.removeEventListener('keydown', handleEscape);
    }, [onClose]);

    // 🔥 FUNCIÓN PARA CAMBIAR ENDPOINT CUANDO CAMBIA EL SERVICIO
    useEffect(() => {
        const service = availableServices[selectedService];
        if (service && service.templates.length > 0) {
            setEndpoint(service.templates[0].example);
        }
    }, [selectedService]);

    // ================================
    // PASO 1: SOLO HACER REQUEST AL ENDPOINT (SIN JSONPATH)
    // ================================
    const fetchApiData = async (): Promise<void> => {
        if (!token.trim()) {
            setMessage('❌ Please enter a valid dev token');
            return;
        }

        if (!endpoint.trim()) {
            setMessage('❌ Please enter an endpoint');
            return;
        }

        setIsLoading(true);
        setMessage('🔄 Fetching API data...');

        try {
            // Usar el comando existente pero con JSONPath = "$" (root) para obtener todo
            const requestData = {
                environment,
                service: selectedService,
                endpoint,
                token,
                jsonpath_query: '$' // Solo root object para obtener todo el JSON
            };

            console.log('📡 Fetching API data:', requestData);

            const response = await invoke<ApiResponse>('execute_jsonpath_query', {
                request: requestData
            });

            console.log('📥 API Response:', response);

            if (response.success) {
                setApiResponse(response.raw_response || '');
                setJsonPathResult(''); // Limpiar resultados previos
                setMessage(`✅ Data fetched successfully (${response.execution_time_ms}ms) - ${response.url_used}`);
            } else {
                setApiResponse(response.error || 'Unknown error');
                setJsonPathResult('');
                setMessage(`❌ Request failed: ${response.error}`);
            }

        } catch (error) {
            console.error('❌ Request failed:', error);
            setApiResponse(`Error: ${error}`);
            setJsonPathResult('');
            setMessage(`❌ Request failed: ${error}`);
        } finally {
            setIsLoading(false);
        }
    };

    // ================================
    // PASO 2: APLICAR JSONPATH AL JSON YA OBTENIDO (LOCAL)
    // ================================
    const executeJsonPath = async (): Promise<void> => {
        if (!apiResponse || !jsonPathQuery.trim()) {
            setMessage('❌ Need both API response and JSONPath query');
            return;
        }

        setIsLoading(true);
        setMessage('🔍 Applying JSONPath query...');

        // 🚀 OPTIMIZACIÓN: Dar tiempo al UI para actualizar
        await new Promise(resolve => setTimeout(resolve, 50));

        try {
            // 🚀 OPTIMIZACIÓN: Validar tamaño de JSON antes de procesar
            if (apiResponse.length > 500000) { // Para JSONs > 500KB
                setMessage('🔄 Processing large JSON data...');
                await new Promise(resolve => setTimeout(resolve, 100));
            }

            // Usar comando local para solo procesar JSONPath
            // 🔥 CORRECCIÓN: usar jsonText (camelCase) en lugar de json_text (snake_case)
            const result = await invoke<string>('validate_jsonpath_query', {
                jsonText: apiResponse,  // 👈 Cambio aquí: jsonText en lugar de json_text
                query: jsonPathQuery
            });

            // 🚀 OPTIMIZACIÓN: Para resultados grandes, dar tiempo al UI
            if (result.length > 50000) {
                setMessage('🔄 Formatting results...');
                await new Promise(resolve => setTimeout(resolve, 50));
            }

            setJsonPathResult(result);
            setMessage('✅ JSONPath applied successfully');
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            setJsonPathResult(`JSONPath Error: ${errorMessage}`);
            setMessage(`❌ JSONPath failed: ${errorMessage}`);
        } finally {
            setIsLoading(false);
        }
    };

    // ================================
    // FUNCIONES DE UTILIDAD
    // ================================
    const testConnectivity = async (): Promise<void> => {
        setMessage('🔍 Testing connectivity...');
        try {
            const result = await invoke<string>('test_api_connectivity', {
                environment,
                service: selectedService
            });
            setMessage(result);
        } catch (error) {
            setMessage(`❌ Connectivity test failed: ${error}`);
        }
    };

    const buildPreviewUrl = async (): Promise<void> => {
        try {
            const url = await invoke<string>('build_preview_url', {
                environment,
                service: selectedService,
                endpoint
            });
            setMessage(`🌐 URL: ${url}`);
        } catch (error) {
            setMessage(`❌ URL build failed: ${error}`);
        }
    };

    const copyToClipboard = (text: string): void => {
        navigator.clipboard.writeText(text);
        setMessage('📋 Copied to clipboard!');
        setTimeout(() => setMessage('Ready to make real API requests'), 2000);
    };

    const clear = (): void => {
        setApiResponse('');
        setJsonPathResult('');
        setMessage('Ready to make real API requests');
    };

    // 🔥 FUNCIÓN PARA USAR TEMPLATE
    const useTemplate = (template: {
        name: string;
        pattern: string;
        example: string;
        description: string;
    }): void => {
        setEndpoint(template.example);
        setMessage(`📝 Using template: ${template.name} - ${template.description}`);
    };

    return (
        <div className="jsonpath-modal-backdrop">
            <div className="jsonpath-tool-container">
                {/* Header */}
                <div className="jsonpath-header">
                    <div className="header-content">
                        <div className="header-left">
                            <div className="header-icon">
                                <Icon emoji="🔍" size={20} />
                            </div>
                            <div className="header-info">
                                <h1>KAP JSONPath API Tool</h1>
                                <p>Real-time JSONPath querying with KAP APIs</p>
                            </div>
                        </div>
                        <div className="header-status" style={{
                            color: isLoading ? '#ffd93d' : '#a0a3bd'
                        }}>
                            <Icon emoji={isLoading ? "⏳" : "⚡"} size={14} />
                            <span>{message}</span>
                        </div>
                    </div>

                    {/* 🔥 BOTÓN CERRAR */}
                    <button
                        className="jsonpath-close-button"
                        onClick={onClose}
                        title="Close JSONPath Tool (ESC)"
                    >
                        ✕
                    </button>
                </div>

                {/* Main Content */}
                <div className="jsonpath-main">
                    {/* Left Panel - Configuration */}
                    <div className="jsonpath-sidebar">
                        <div className="sidebar-content">
                            {/* Environment - Solo Sandbox 3 */}
                            <div className="form-group">
                                <label className="form-label">
                                    <Icon emoji="🌍" size={14} className="label-icon" />
                                    Environment
                                </label>
                                <select
                                    value={environment}
                                    onChange={(e) => setEnvironment(e.target.value)}
                                    className="form-select"
                                >
                                    {availableEnvironments.map((env) => (
                                        <option key={env.key} value={env.key}>
                                            {env.name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Service */}
                            <div className="form-group">
                                <label className="form-label">
                                    <Icon emoji="⚙️" size={14} className="label-icon" />
                                    Service
                                </label>
                                <select
                                    value={selectedService}
                                    onChange={(e) => setSelectedService(e.target.value)}
                                    className="form-select"
                                >
                                    {Object.entries(availableServices).map(([key, service]) => (
                                        <option key={key} value={key}>
                                            {service.name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Endpoint Templates */}
                            <div className="form-group">
                                <label className="form-label">
                                    📋 Endpoint Templates ({availableServices[selectedService]?.templates.length || 0})
                                </label>
                                <select
                                    value=""
                                    onChange={(e) => {
                                        if (e.target.value) {
                                            const template = availableServices[selectedService]?.templates.find(t => t.example === e.target.value);
                                            if (template) {
                                                useTemplate(template);
                                            }
                                        }
                                    }}
                                    className="form-select"
                                >
                                    <option value="">Select an endpoint...</option>
                                    {availableServices[selectedService]?.templates.map((template, index) => (
                                        <option key={index} value={template.example}>
                                            {template.name} - {template.pattern}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Endpoint */}
                            <div className="form-group">
                                <label className="form-label">
                                    <Icon emoji="📄" size={14} className="label-icon" />
                                    Endpoint Path
                                </label>
                                <input
                                    type="text"
                                    value={endpoint}
                                    onChange={(e) => setEndpoint(e.target.value)}
                                    placeholder="/health"
                                    className="form-input"
                                />
                                <button
                                    onClick={buildPreviewUrl}
                                    className="template-btn"
                                    style={{ marginTop: '8px', fontSize: '11px' }}
                                >
                                    Preview URL
                                </button>
                                <button
                                    onClick={fetchApiData}
                                    disabled={!token.trim() || !endpoint.trim() || isLoading}
                                    className="execute-btn"
                                    style={{ marginTop: '8px', fontSize: '11px', marginLeft: '8px' }}
                                >
                                    <Icon emoji={isLoading ? "⏳" : "📡"} size={14} />
                                    {isLoading ? 'Fetching...' : 'Fetch Data'}
                                </button>
                            </div>

                            {/* Token */}
                            <div className="form-group">
                                <label className="form-label">
                                    <Icon emoji="🔑" size={14} className="label-icon" />
                                    Dev Token
                                </label>
                                <div className="token-input-container">
                                    <input
                                        type={showToken ? 'text' : 'password'}
                                        value={token}
                                        onChange={(e) => setToken(e.target.value)}
                                        placeholder="x-jetstream-devtoken"
                                        className="form-input"
                                    />
                                    <button
                                        onClick={() => setShowToken(!showToken)}
                                        className="token-toggle"
                                    >
                                        {showToken ? '🙈' : '👁️'}
                                    </button>
                                </div>
                            </div>

                            {/* JSONPath Query */}
                            <div className="form-group">
                                <label className="form-label">
                                    <Icon emoji="🔍" size={14} className="label-icon" />
                                    JSONPath Query
                                </label>
                                <input
                                    type="text"
                                    value={jsonPathQuery}
                                    onChange={(e) => setJsonPathQuery(e.target.value)}
                                    placeholder="$"
                                    className="form-input"
                                />
                            </div>

                            {/* Action Buttons */}
                            <div className="action-buttons">
                                <button
                                    onClick={executeJsonPath}
                                    disabled={!apiResponse || !jsonPathQuery.trim() || isLoading}
                                    className="execute-btn"
                                    title="Apply JSONPath to fetched data"
                                >
                                    <Icon emoji={isLoading ? "⏳" : "🔍"} size={16} />
                                    {isLoading ? 'Processing...' : 'Execute JSONPath'}
                                </button>
                                <button
                                    onClick={testConnectivity}
                                    className="template-btn"
                                    title="Test connectivity"
                                >
                                    <Icon emoji="🔗" size={16} />
                                </button>
                                <button
                                    onClick={clear}
                                    className="clear-btn"
                                    title="Clear results"
                                >
                                    <Icon emoji="🔄" size={16} />
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Right Panel - Results */}
                    <div className="jsonpath-results">
                        {/* API Response with JSON Viewer */}
                        <div className="result-panel">
                            <JsonViewer
                                data={apiResponse}
                                title="🌐 API Response (Formatted JSON)"
                                onCopy={copyToClipboard}
                            />
                        </div>

                        {/* JSONPath Results with JSON Viewer */}
                        <div className="result-panel">
                            <JsonViewer
                                data={jsonPathResult}
                                title="⚡ JSONPath Results"
                                onCopy={copyToClipboard}
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default JSONPathTool;