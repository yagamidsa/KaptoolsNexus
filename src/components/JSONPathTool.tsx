
import React, { useState, useEffect, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import './JSONPathTool.css';
import { listen } from '@tauri-apps/api/event';


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
    const [jsonViewMode, setJsonViewMode] = useState<'raw' | 'formatted' | 'truncated'>('truncated');
    const [showFullJson, setShowFullJson] = useState<boolean>(false);

    // 🔥 CONFIGURACIÓN FIJA - Solo Sandbox 3
    const availableEnvironments: Environment[] = [
        { key: 'sandbox3', name: 'Sandbox 3', prefix: 'sandbox3-' }
    ];

    const [processingStrategy, setProcessingStrategy] = useState<string>('fast');
    const [estimatedTime, setEstimatedTime] = useState<number>(0);
    const [progressData, setProgressData] = useState<{
        stage: string;
        progress: number;
        message: string;
    } | null>(null);

    useEffect(() => {
        let unlisten: (() => void) | null = null;

        const setupProgressListener = async () => {
            unlisten = await listen('jsonpath_progress', (event) => {
                const progress = event.payload as {
                    stage: string;
                    progress: number;
                    message: string;
                };

                console.log('📊 Progress update:', progress);
                setProgressData(progress);

                // Actualizar mensaje con progreso
                setMessage(`🔄 ${progress.message} (${progress.progress}%)`);
            });
        };

        setupProgressListener();

        // Cleanup
        return () => {
            if (unlisten) {
                unlisten();
            }
        };
    }, []);



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
                {
                    name: 'Get Study by ID',
                    pattern: '/studies/{study_id}',
                    example: '/studies/KapID',
                    description: '📄 Get study by ID without project context'
                },
                // === PROJECT ENDPOINTS ===
                {
                    name: 'Get Project Details',
                    pattern: '/Projects/{ProjectID}',
                    example: '/Projects/ProjectID',
                    description: '📄 Get project by ID with studies, waves and modules'
                },
                {
                    name: 'Get Short Project',
                    pattern: '/shortprojects/{ProjectID}',
                    example: '/shortprojects/ProjectID',
                    description: '📋 Get short project object with studies, waves and modules'
                },
                {
                    name: 'Get Project Users',
                    pattern: '/Projects/{ProjectID}/users',
                    example: '/Projects/ProjectID/users',
                    description: '👥 Get all users assigned to a project'
                },
                {
                    name: 'Get Studies for Navigation',
                    pattern: '/projects/{ProjectID}/studies/navigationv2',
                    example: '/projects/ProjectID/studies/navigationv2',
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
                    name: 'Get Study with Project',
                    pattern: '/projects/{project_id}/studies/{study_id}',
                    example: '/projects/ProjectID/studies/KapID',
                    description: '📋 Get study by ID within project context'
                },
                {
                    name: 'Get All Studies for Project',
                    pattern: '/Projects/{project_id}/studies',
                    example: '/Projects/ProjectID/studies',
                    description: '📚 Get all studies for a specific project'
                },
                {
                    name: 'Get Study Languages',
                    pattern: '/Projects/{project_id}/studies/{study_id}/languages',
                    example: '/Projects/ProjectID/studies/KapID/languages',
                    description: '🌍 Get all languages available for a study'
                },
                {
                    name: 'Get Study Simple Settings',
                    pattern: '/studies/{study_id}/simple_settings',
                    example: '/studies/KapID/simple_settings',
                    description: '🔧 Get all simple settings for a study'
                },
                {
                    name: 'Get Study Master Property',
                    pattern: '/studies/{study_id}/master_property/{property_value}',
                    example: '/studies/KapID/master_property/{property_value}',
                    description: '🏷️ Get master properties by study'
                },
                {
                    name: 'Get Simple Settings by Product Type',
                    pattern: '/projects/{project_id}/simple_settings_meta/{product_type_id}',
                    example: '/projects/ProjectID/simple_settings_meta/{product_type_id}',
                    description: '📋 Get simple settings metadata by product type'
                },

                // === WAVE ENDPOINTS ===
                {
                    name: 'Get Wave Details',
                    pattern: '/waves/{wave_id}',
                    example: '/waves/WaveID',
                    description: '📄 Get complete wave data by wave ID'
                },
                {
                    name: 'Get Short Wave',
                    pattern: '/waves/{wave_id}/shortwave',
                    example: '/waves/WaveID/shortwave',
                    description: '📋 Get short wave details'
                },
                {
                    name: 'Get Waves for Study',
                    pattern: '/projects/{project_id}/studies/{study_id}/waves',
                    example: '/projects/ProjectID/studies/KapID/waves',
                    description: '📊 Get all waves for a specific study'
                },
                {
                    name: 'Get Wave Simple Settings',
                    pattern: '/waves/{wave_id}/simple_settings',
                    example: '/waves/WaveID/simple_settings',
                    description: '⚙️ Get all simple settings for a wave'
                },
                {
                    name: 'Get Wave Flag by Name',
                    pattern: '/waves/{wave_id}/flags/{flag_name}',
                    example: '/waves/WaveID/flags/{flag_name}',
                    description: '🏷️ Get wave flag status by name'
                },
                {
                    name: 'Get Wave Study Creation Objects',
                    pattern: '/waves/{wave_id}/GetObjectsForStudyCreation',
                    example: '/waves/WaveID/GetObjectsForStudyCreation',
                    description: '🏗️ Get objects needed for study creation'
                },
                {
                    name: 'Get Scripting Package Location',
                    pattern: '/waves/{wave_id}/scripting-package-location',
                    example: '/waves/WaveID/scripting-package-location',
                    description: '📦 Get URL to download scripting package'
                },
                {
                    name: 'Get Wave Simple Settings Metadata (Tesseract)',
                    pattern: '/tesseract/waves/{wave_id}/simple_settings_meta',
                    example: '/tesseract/waves/WaveID/simple_settings_meta',
                    description: '🔧 Get simple setting metadata for wave using Tesseract'
                },
                {
                    name: 'Get Wave Master Property (Tesseract)',
                    pattern: '/tesseract/waves/{wave_id}/master_property/{property_value}',
                    example: '/tesseract/waves/WaveID/master_property/{property_value}',
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
                    name: 'Get All Tesseract List Sources',
                    pattern: '/tesseract/lists_source',
                    example: '/tesseract/lists_source?productId={productid}}',
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
                    example: '/tesseract/country-incidence-threshold/US?productId={productid}}',
                    description: '🔧 Check incidence rate threshold using Tesseract'
                },
                {
                    name: 'Get Product Clients (Tesseract)',
                    pattern: '/tesseract/product_clients/{product_type_id}',
                    example: '/tesseract/product_clients/product_type_id',
                    description: '👥 Get clients by product type using Tesseract'
                },
                {
                    name: 'Get Simple Settings by Product & Locale (Tesseract)',
                    pattern: '/tesseract/simple_settings_meta/{product_type_id}',
                    example: '/tesseract/simple_settings_meta/product_type_id?locale=en-US',
                    description: '🌍 Get simple settings by product type and locale'
                },

                // === TESSERACT ENDPOINTS ===
                {
                    name: 'Get Study Master Property (Tesseract)',
                    pattern: '/tesseract/studies/{study_id}/master_property/{property_value}',
                    example: '/tesseract/studies/KapID/master_property/client_name',
                    description: '🔧 Get study master properties using Tesseract'
                },
                {
                    name: 'Get Study Simple Settings Metadata (Tesseract)',
                    pattern: '/tesseract/studies/{study_id}/simple_settings_meta',
                    example: '/tesseract/studies/KapID/simple_settings_meta',
                    description: '⚙️ Get study simple settings metadata using Tesseract'
                },
                {
                    name: 'Get Simple Settings by Product Type (Tesseract)',
                    pattern: '/tesseract/projects/{project_id}/simple_settings_meta/{product_type_id}',
                    example: '/tesseract/projects/ProjectID/simple_settings_meta/product_type_id',
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

                // === WAVE API MODULE ===
                {
                    name: 'Wave List Replacements',
                    pattern: '/waves/{wave_id}/list_replacements',
                    example: '/waves/W123456/list_replacements',
                    description: '📋 Returns list replacements for a wave'
                },
                {
                    name: 'Wave Text Replacements',
                    pattern: '/waves/{wave_id}/text_replacements',
                    example: '/waves/W123456/text_replacements',
                    description: '📝 Returns text replacements for a wave'
                },
                {
                    name: 'Wave Selected Questions',
                    pattern: '/waves/{wave_id}/questions',
                    example: '/waves/W123456/questions',
                    description: '✅ Returns selected questions for a wave'
                },
                {
                    name: 'Wave Questionnaire Version',
                    pattern: '/waves/{wave_id}/questionnaire-version',
                    example: '/waves/W123456/questionnaire-version',
                    description: '📄 Returns questionnaire version for wave'
                },
                {
                    name: 'Wave All Questions',
                    pattern: '/waves/{wave_id}/all-questions',
                    example: '/waves/W123456/all-questions',
                    description: '❓ Returns all the wave questions'
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
                    name: 'Wave Quotable Questions',
                    pattern: '/waves/{wave_id}/quotable-questions',
                    example: '/waves/W123456/quotable-questions',
                    description: '❓ Returns quotable questions for a wave'
                },
                {
                    name: 'Wave Subgroup Questions',
                    pattern: '/waves/{wave_id}/subgroup-questions',
                    example: '/waves/W123456/subgroup-questions',
                    description: '👥 Returns single/multi coded questions for wave (requires user_id header)'
                },
                {
                    name: 'Wave Boostable Questions',
                    pattern: '/waves/{wave_id}/boostable-questions',
                    example: '/waves/W123456/boostable-questions',
                    description: '🚀 Returns boostable questions for wave (requires user_id header)'
                },
                {
                    name: 'Wave Media',
                    pattern: '/waves/{wave_id}/media',
                    example: '/waves/W123456/media',
                    description: '🎬 Returns media for a wave'
                },
                {
                    name: 'Wave Qlib Update Status',
                    pattern: '/waves/{wave_id}/qlib-update-status',
                    example: '/waves/W123456/qlib-update-status',
                    description: '🔄 Returns qlib update status for wave'
                },
                {
                    name: 'Wave EyeSquare Metadata',
                    pattern: '/waves/{wave_id}/eye-square-metadata',
                    example: '/waves/W123456/eye-square-metadata',
                    description: '👁️ Returns EyeSquare metadata for wave'
                },
                {
                    name: 'Sample Definition by Product',
                    pattern: '/sample_definitions/{product_name}',
                    example: '/sample_definitions/ProductName',
                    description: '📊 Returns sample definition for a product'
                },
                {
                    name: 'Wave Qlib Content',
                    pattern: '/waves/{wave_id}/qlibcontent',
                    example: '/waves/W123456/qlibcontent',
                    description: '📚 Returns the qlib content for a wave'
                },
                {
                    name: 'Wave Weightable Questions',
                    pattern: '/waves/{wave_id}/weightable-questions',
                    example: '/waves/W123456/weightable-questions',
                    description: '⚖️ Returns the Weightable Questions for a wave (requires user_id header)'
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


    const detectProcessingStrategy = useCallback(async (jsonText: string) => {
        if (!jsonText) return;

        try {
            const strategyResult = await invoke<string>('get_json_processing_strategy', {
                jsonText: jsonText
            });

            const strategy = JSON.parse(strategyResult);
            setProcessingStrategy(strategy.strategy);
            setEstimatedTime(strategy.estimated_time_ms);

            console.log('📊 Processing strategy:', strategy);

            // Mostrar info de estrategia al usuario
            const sizeText = strategy.size_mb < 1
                ? `${(strategy.size_mb * 1000).toFixed(0)}KB`
                : `${strategy.size_mb.toFixed(1)}MB`;

            const timeText = strategy.estimated_time_ms < 1000
                ? `~${strategy.estimated_time_ms}ms`
                : `~${(strategy.estimated_time_ms / 1000).toFixed(1)}s`;

            setMessage(`📊 JSON size: ${sizeText} | Strategy: ${strategy.strategy} | Est. time: ${timeText}`);

        } catch (error) {
            console.error('Strategy detection failed:', error);
            setProcessingStrategy('fast');
            setEstimatedTime(0);
        }
    }, []);



    const executeJsonPath = useCallback(async (): Promise<void> => {
        if (!apiResponse || !jsonPathQuery.trim()) {
            setMessage('❌ Need both API response and JSONPath query');
            return;
        }

        const jsonSize = apiResponse.length;
        setIsLoading(true);
        setJsonPathResult(''); // Limpiar resultados previos
        setProgressData(null); // Reset progress

        console.log(`🚀 Starting JSONPath execution for ${jsonSize} chars`);

        try {
            // Detectar estrategia de procesamiento
            await detectProcessingStrategy(apiResponse);

            // 🚀 ESTRATEGIA BASADA EN TAMAÑO
            if (jsonSize < 500_000) {
                // Para JSONs pequeños: método rápido
                await executeJsonPathFast();
            } else if (jsonSize < 2_000_000) {
                // Para JSONs medianos: con progress
                await executeJsonPathWithProgress();
            } else {
                // Para JSONs grandes: async/worker
                await executeJsonPathLarge();
            }

        } catch (error) {
            console.error('❌ JSONPath execution failed:', error);
            const errorMessage = error instanceof Error ? error.message : String(error);
            setJsonPathResult(`JSONPath Error: ${errorMessage}`);
            setMessage(`❌ JSONPath failed: ${errorMessage}`);
        } finally {
            setIsLoading(false);
            setProgressData(null);
        }
    }, [apiResponse, jsonPathQuery, detectProcessingStrategy]);


    // ================================
    // FUNCIÓN PARA JSONs PEQUEÑOS (<500KB)
    // ================================
    const executeJsonPathFast = async (): Promise<void> => {
        setMessage('⚡ Fast processing for small JSON...');

        const result = await invoke<string>('validate_jsonpath_query', {
            jsonText: apiResponse,
            query: jsonPathQuery
        });

        const highlightedResult = formatJsonPathResult(result); // ← Esta línea debe estar
        setJsonPathResult(highlightedResult);
        setMessage('✅ JSONPath applied successfully (fast mode)');
    };

    // ================================
    // FUNCIÓN PARA JSONs MEDIANOS (500KB-2MB)
    // ================================
    const executeJsonPathWithProgress = async (): Promise<void> => {
        setMessage('📊 Processing with progress tracking...');

        const result = await invoke<string>('validate_jsonpath_with_progress', {
            jsonText: apiResponse,
            query: jsonPathQuery
        });

        const highlightedResult = formatJsonPathResult(result); // ← Esta línea debe estar
        setJsonPathResult(highlightedResult);
        setMessage('✅ JSONPath applied successfully (with progress)');
    };

    // ================================
    // FUNCIÓN PARA JSONs GRANDES (>2MB)
    // ================================
    const executeJsonPathLarge = async (): Promise<void> => {
        setMessage('🏭 Using async processing for large JSON...');

        const result = await invoke<string>('validate_jsonpath_query_async', {
            jsonText: apiResponse,
            query: jsonPathQuery
        });

        const highlightedResult = formatJsonPathResult(result);
        setJsonPathResult(highlightedResult);
        setMessage('✅ Large JSON processed successfully (async mode)');
    };

    // ================================
    // AUTO-DETECT STRATEGY CUANDO CAMBIA EL JSON
    // ================================

    // AGREGAR este useEffect después de los existentes:
    useEffect(() => {
        if (apiResponse && apiResponse.length > 0) {
            detectProcessingStrategy(apiResponse);
        }
    }, [apiResponse, detectProcessingStrategy]);


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


    // 🎨 Función para syntax highlighting
    // 🎨 Función para syntax highlighting
    const applySyntaxHighlighting = (jsonString: string): string => {
        try {
            const parsed = JSON.parse(jsonString);
            const formatted = JSON.stringify(parsed, null, 2);

            let highlighted = formatted;

            // 🔑 Keys (propiedades) - Rosa vibrante
            highlighted = highlighted.replace(
                /"([^"]+)"(\s*:)/g,
                '<span class="json-key">"$1"</span>$2'
            );

            // 🟢 Strings (valores) - Verde - MEJORADO PARA ARRAYS
            highlighted = highlighted.replace(
                /:\s*"([^"]*)"/g,
                ': <span class="json-string">"$1"</span>'
            );

            // 🟢 Strings en arrays (sin :) - Verde
            highlighted = highlighted.replace(
                /(\s+)"([^"]*)"(?=,|\s*\])/g,
                '$1<span class="json-string">"$2"</span>'
            );

            // 🟣 Numbers - Púrpura
            highlighted = highlighted.replace(
                /:\s*(-?\d+\.?\d*)/g,
                ': <span class="json-number">$1</span>'
            );

            // 🟣 Numbers en arrays - Púrpura  
            highlighted = highlighted.replace(
                /(\s+)(-?\d+\.?\d*)(?=,|\s*\])/g,
                '$1<span class="json-number">$2</span>'
            );

            // 🟠 Booleans - Naranja
            highlighted = highlighted.replace(
                /:\s*(true|false)/g,
                ': <span class="json-boolean">$1</span>'
            );

            // 🟠 Booleans en arrays - Naranja
            highlighted = highlighted.replace(
                /(\s+)(true|false)(?=,|\s*\])/g,
                '$1<span class="json-boolean">$2</span>'
            );

            // ⚫ Null - Gris
            highlighted = highlighted.replace(
                /:\s*(null)/g,
                ': <span class="json-null">$1</span>'
            );

            // ⚫ Null en arrays - Gris
            highlighted = highlighted.replace(
                /(\s+)(null)(?=,|\s*\])/g,
                '$1<span class="json-null">$2</span>'
            );

            // ⚪ Brackets y Punctuation - Blanco
            highlighted = highlighted.replace(
                /([{}[\],])/g,
                '<span class="json-punctuation">$1</span>'
            );

            return highlighted;

        } catch (error) {
            return jsonString;
        }
    };



    // 🎯 Función para formatear resultados JSONPath
    // 🎯 Función para formatear resultados JSONPath
    const formatJsonPathResult = (result: string): string => {
        console.log('🔍 formatJsonPathResult input:', result); // ← AGREGAR ESTA LÍNEA

        if (!result || result.trim() === '') {
            return '';
        }

        // Si el resultado es JSON válido, aplicar highlighting
        try {
            JSON.parse(result);
            console.log('✅ JSON válido, aplicando highlighting'); // ← AGREGAR ESTA LÍNEA
            return applySyntaxHighlighting(result);
        } catch {
            console.log('❌ No es JSON válido, procesando como valor simple'); // ← AGREGAR ESTA LÍNEA
            // Si no es JSON, pero parece ser un valor simple
            const trimmed = result.trim();

            if (trimmed.startsWith('"') && trimmed.endsWith('"')) {
                console.log('🟢 Detectado como string'); // ← AGREGAR ESTA LÍNEA
                return `<span class="json-string">${trimmed}</span>`;
            }

            if (/^-?\d+\.?\d*$/.test(trimmed)) {
                console.log('🟣 Detectado como number'); // ← AGREGAR ESTA LÍNEA
                return `<span class="json-number">${trimmed}</span>`;
            }

            if (trimmed === 'true' || trimmed === 'false') {
                console.log('🟠 Detectado como boolean'); // ← AGREGAR ESTA LÍNEA
                return `<span class="json-boolean">${trimmed}</span>`;
            }

            if (trimmed === 'null') {
                console.log('⚫ Detectado como null'); // ← AGREGAR ESTA LÍNEA
                return `<span class="json-null">${trimmed}</span>`;
            }

            console.log('⚪ Devolviendo texto plano'); // ← AGREGAR ESTA LÍNEA
            return trimmed;
        }
    };

    // Función para truncar JSON grande
    const getTruncatedJson = (jsonString: string, maxLength: number = 30000): string => {
        try {
            // PRIMERO formatear el JSON completo
            const parsed = JSON.parse(jsonString);
            const formatted = JSON.stringify(parsed, null, 2);
            const highlighted = applySyntaxHighlighting(formatted);

            // DESPUÉS truncar el resultado ya formateado
            if (highlighted.length <= maxLength) {
                return highlighted;
            }

            const truncated = highlighted.slice(0, maxLength);
            const lastNewline = truncated.lastIndexOf('\n');
            const safeEnd = lastNewline > 0 ? lastNewline : maxLength;

            return truncated.slice(0, safeEnd) +
                '\n\n<span class="json-truncated">... [JSON truncated for performance - Click "Full" to see complete content]</span>';

        } catch (error) {
            // Si no es JSON válido, devolver texto plano
            return jsonString;
        }
    };

    // Función para formatear JSON ligero
    const formatJsonLight = (jsonString: string): string => {
        try {
            const parsed = JSON.parse(jsonString);

            if (jsonString.length > 100000) {
                const formatted = JSON.stringify(parsed, null, 1);
                return applySyntaxHighlighting(formatted);
            }

            const formatted = JSON.stringify(parsed, null, 2);
            return applySyntaxHighlighting(formatted);
        } catch (error) {
            return jsonString;
        }
    };


    const FastJsonViewer = ({ data, title, onCopy }: {
        data: string;
        title: string;
        onCopy: (text: string) => void;
    }) => {
        const jsonSize = data.length;
        const isLarge = jsonSize > 200_000; // 200KB
        const [localViewMode, setLocalViewMode] = useState<'raw' | 'formatted' | 'truncated'>(
            isLarge ? 'truncated' : 'formatted'
        );

        if (!data) {
            return (
                <div className="result-panel">
                    <div className="result-header">
                        <h3>{title}</h3>
                    </div>
                    <div className="result-content" style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#a0a3bd',
                        fontStyle: 'italic',
                        minHeight: '100px'
                    }}>
                        No data to display
                    </div>
                </div>
            );
        }

        // Determinar qué mostrar según el modo
        const getDisplayContent = () => {
            // Si ya tiene highlighting HTML, devolverlo tal como está
            if (data.includes('<span class="json-')) {
                return data;
            }

            switch (localViewMode) {
                case 'raw':
                    return data; // JSON original sin formatear
                case 'formatted':
                    return applySyntaxHighlighting(data); // SIEMPRE con highlighting
                case 'truncated':
                    return isLarge ? getTruncatedJson(data, 30000) : applySyntaxHighlighting(data); // SIEMPRE con highlighting
                default:
                    return applySyntaxHighlighting(data); // SIEMPRE con highlighting
            }
        };

        const displayContent = getDisplayContent();

        return (
            <div className="result-panel">
                <div className="result-header">
                    <h3>{title}</h3>
                    <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
                        {/* Indicador de tamaño */}
                        <span style={{
                            fontSize: '11px',
                            color: isLarge ? '#f59e0b' : '#22c55e',
                            background: isLarge ? 'rgba(245, 158, 11, 0.2)' : 'rgba(34, 197, 94, 0.2)',
                            padding: '2px 6px',
                            borderRadius: '3px'
                        }}>
                            {(jsonSize / 1024).toFixed(1)}KB
                        </span>

                        {/* Botones de modo de vista para JSONs grandes */}
                        {isLarge && (
                            <>
                                <button
                                    onClick={() => setLocalViewMode('truncated')}
                                    className={`copy-btn ${localViewMode === 'truncated' ? 'active' : ''}`}
                                    style={{
                                        fontSize: '10px',
                                        padding: '3px 6px',
                                        background: localViewMode === 'truncated' ? 'rgba(108, 92, 231, 0.3)' : undefined
                                    }}
                                    title="Show first 30KB (fast)"
                                >
                                    Preview
                                </button>
                                <button
                                    onClick={() => setLocalViewMode('raw')}
                                    className={`copy-btn ${localViewMode === 'raw' ? 'active' : ''}`}
                                    style={{
                                        fontSize: '10px',
                                        padding: '3px 6px',
                                        background: localViewMode === 'raw' ? 'rgba(108, 92, 231, 0.3)' : undefined
                                    }}
                                    title="Show raw JSON (fastest)"
                                >
                                    Raw
                                </button>
                                <button
                                    onClick={() => setLocalViewMode('formatted')}
                                    className={`copy-btn ${localViewMode === 'formatted' ? 'active' : ''}`}
                                    style={{
                                        fontSize: '10px',
                                        padding: '3px 6px',
                                        background: localViewMode === 'formatted' ? 'rgba(108, 92, 231, 0.3)' : undefined
                                    }}
                                    title="Show full formatted JSON (may be slow)"
                                >
                                    Full
                                </button>
                            </>
                        )}

                        {/* Botón Copy */}
                        <button
                            onClick={() => onCopy(data)} // Siempre copia el JSON completo
                            className="copy-btn"
                            title="Copy full JSON to clipboard"
                        >
                            <Icon emoji="📋" size={12} />
                            Copy
                        </button>
                    </div>
                </div>

                {/* Contenido JSON */}
                <div className="result-content" style={{ position: 'relative' }}>
                    <pre
                        style={{
                            margin: 0,
                            padding: '12px 12px 20px 12px',  // ← Más padding abajo
                            fontSize: '12px',
                            lineHeight: '1.4',
                            color: '#e2e8f0',
                            background: 'transparent',
                            overflow: 'auto',
                            maxHeight: '380px',              // ← Reducir altura para dar espacio
                            fontFamily: 'Monaco, Menlo, "Ubuntu Mono", monospace',
                            whiteSpace: 'pre-wrap',
                            wordBreak: 'break-word',
                            boxSizing: 'border-box'          // ← Agregar esto
                        }}
                        dangerouslySetInnerHTML={{ __html: displayContent }}
                    />

                    {/* Indicador de contenido truncado */}
                    {localViewMode === 'truncated' && isLarge && (
                        <div style={{
                            position: 'absolute',
                            bottom: '12px',
                            right: '12px',
                            background: 'rgba(108, 92, 231, 0.2)',
                            color: '#6c5ce7',
                            padding: '4px 8px',
                            borderRadius: '4px',
                            fontSize: '10px',
                            border: '1px solid rgba(108, 92, 231, 0.3)'
                        }}>
                            📄 Showing preview - Click "Full" for complete JSON
                        </div>
                    )}
                </div>
            </div>
        );
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

                            {/* Progress Indicator */}
                            {progressData && (
                                <div className="progress-container">
                                    <div className="progress-bar">
                                        <div
                                            className="progress-fill"
                                            style={{ width: `${progressData.progress}%` }}
                                        ></div>
                                    </div>
                                    <div className="progress-text">
                                        {progressData.message} - {progressData.progress}%
                                    </div>
                                </div>
                            )}

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
                        {/* API Response with Optimized JSON Display */}
                        <FastJsonViewer
                            data={apiResponse}
                            title="🌐 API Response (Formatted JSON)"
                            onCopy={copyToClipboard}
                        />

                        <FastJsonViewer
                            data={jsonPathResult}
                            title="⚡ JSONPath Results"
                            onCopy={copyToClipboard}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default JSONPathTool;