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

interface JsonPathExample {
    name: string;
    query: string;
    description: string;
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
    const [jsonPathQuery, setJsonPathQuery] = useState<string>('$.data[*]');
    const [showToken, setShowToken] = useState<boolean>(false);
    const [apiResponse, setApiResponse] = useState<string>('');
    const [jsonPathResult, setJsonPathResult] = useState<string>('');
    const [message, setMessage] = useState<string>('Ready to make real API requests');
    const [isLoading, setIsLoading] = useState<boolean>(false);

    // 🔥 CONFIGURACIÓN FIJA - Solo Sandbox 3
    const availableEnvironments: Environment[] = [
        { key: 'sandbox3', name: 'Sandbox 3', prefix: 'sandbox3-' }
    ];

    // 🔥 TODOS LOS ENDPOINTS GET DEL OPENAPI DE QUESTIONNAIRE FACTORY
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
                    name: 'Version Info', 
                    pattern: '/version', 
                    example: '/version',
                    description: '📋 Get service version information'
                },
                { 
                    name: 'Home Page', 
                    pattern: '/', 
                    example: '/',
                    description: '🏠 Service home page'
                },

                // === PROJECT ENDPOINTS ===
                { 
                    name: 'Check Project Exists', 
                    pattern: '/Projects/{projectId}/exists', 
                    example: '/Projects/PRJ123456/exists',
                    description: '✅ Check if project exists and can be read by user'
                },
                { 
                    name: 'Get Project Details', 
                    pattern: '/Projects/{projectId}', 
                    example: '/Projects/PRJ123456',
                    description: '📄 Get project by ID with studies, waves and modules'
                },
                { 
                    name: 'Get Short Project', 
                    pattern: '/shortprojects/{projectId}', 
                    example: '/shortprojects/PRJ123456',
                    description: '📋 Get short project object with studies, waves and modules'
                },
                { 
                    name: 'Get All Projects', 
                    pattern: '/Projects', 
                    example: '/Projects?project_types=all',
                    description: '📂 Get all projects by user and project types'
                },
                { 
                    name: 'Get Project Users', 
                    pattern: '/Projects/{projectId}/users', 
                    example: '/Projects/PRJ123456/users',
                    description: '👥 Get all users assigned to a project'
                },
                { 
                    name: 'Get Projects for Navigation V2', 
                    pattern: '/Projects/navigationv2', 
                    example: '/Projects/navigationv2',
                    description: '🧭 Get all projects for navigation menu'
                },
                { 
                    name: 'Get Studies for Navigation', 
                    pattern: '/projects/{projectId}/studies/navigationv2', 
                    example: '/projects/PRJ123456/studies/navigationv2',
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
                    example: '/studies/STU123456/exists',
                    description: '✅ Check if study exists and can be read by user'
                },
                { 
                    name: 'Get Study by ID', 
                    pattern: '/studies/{study_id}', 
                    example: '/studies/STU123456',
                    description: '📄 Get study by ID without project context'
                },
                { 
                    name: 'Get Study with Project', 
                    pattern: '/projects/{project_id}/studies/{study_id}', 
                    example: '/projects/PRJ123456/studies/STU123456',
                    description: '📋 Get study by ID within project context'
                },
                { 
                    name: 'Get All Studies for Project', 
                    pattern: '/Projects/{project_id}/studies', 
                    example: '/Projects/PRJ123456/studies',
                    description: '📚 Get all studies for a specific project'
                },
                { 
                    name: 'Get Study Languages', 
                    pattern: '/Projects/{project_id}/studies/{study_id}/languages', 
                    example: '/Projects/PRJ123456/studies/STU123456/languages',
                    description: '🌍 Get all languages available for a study'
                },
                { 
                    name: 'Get Study Simple Settings Metadata', 
                    pattern: '/studies/{study_id}/simple_settings_meta', 
                    example: '/studies/STU123456/simple_settings_meta',
                    description: '⚙️ Get simple setting metadata for a study'
                },
                { 
                    name: 'Get Study Simple Settings', 
                    pattern: '/studies/{study_id}/simple_settings', 
                    example: '/studies/STU123456/simple_settings',
                    description: '🔧 Get all simple settings for a study'
                },
                { 
                    name: 'Get Study Master Property', 
                    pattern: '/studies/{study_id}/master_property/{property_value}', 
                    example: '/studies/STU123456/master_property/client_name',
                    description: '🏷️ Get master properties by study'
                },
                { 
                    name: 'Get Simple Settings by Product Type', 
                    pattern: '/projects/{project_id}/simple_settings_meta/{product_type_id}', 
                    example: '/projects/PRJ123456/simple_settings_meta/PROD_TYPE_01',
                    description: '📋 Get simple settings metadata by product type'
                },

                // === WAVE ENDPOINTS ===
                { 
                    name: 'Check Wave Exists', 
                    pattern: '/waves/{waveID}/exists', 
                    example: '/waves/WAV123456/exists',
                    description: '✅ Check if wave exists and can be read by user'
                },
                { 
                    name: 'Get Wave Details', 
                    pattern: '/waves/{wave_id}', 
                    example: '/waves/WAV123456',
                    description: '📄 Get complete wave data by wave ID'
                },
                { 
                    name: 'Get Short Wave', 
                    pattern: '/waves/{wave_id}/shortwave', 
                    example: '/waves/WAV123456/shortwave',
                    description: '📋 Get short wave details'
                },
                { 
                    name: 'Get All Waves for User', 
                    pattern: '/waves', 
                    example: '/waves?includeInternal=false',
                    description: '🌊 Get all waves for assigned users'
                },
                { 
                    name: 'Get Waves for Study', 
                    pattern: '/projects/{project_id}/studies/{study_id}/waves', 
                    example: '/projects/PRJ123456/studies/STU123456/waves',
                    description: '📊 Get all waves for a specific study'
                },
                { 
                    name: 'Get Wave Simple Settings', 
                    pattern: '/waves/{wave_id}/simple_settings', 
                    example: '/waves/WAV123456/simple_settings',
                    description: '⚙️ Get all simple settings for a wave'
                },
                { 
                    name: 'Get Wave Flag by Name', 
                    pattern: '/waves/{wave_id}/flags/{flag_name}', 
                    example: '/waves/WAV123456/flags/published',
                    description: '🏷️ Get wave flag status by name'
                },
                { 
                    name: 'Get Wave Study Creation Objects', 
                    pattern: '/waves/{wave_id}/GetObjectsForStudyCreation', 
                    example: '/waves/WAV123456/GetObjectsForStudyCreation',
                    description: '🏗️ Get objects needed for study creation'
                },
                { 
                    name: 'Get Scripting Package Location', 
                    pattern: '/waves/{wave_id}/scripting-package-location', 
                    example: '/waves/WAV123456/scripting-package-location',
                    description: '📦 Get URL to download scripting package'
                },
                { 
                    name: 'Get Wave Simple Settings Metadata (Tesseract)', 
                    pattern: '/tesseract/waves/{wave_id}/simple_settings_meta', 
                    example: '/tesseract/waves/WAV123456/simple_settings_meta',
                    description: '🔧 Get simple setting metadata for wave using Tesseract'
                },
                { 
                    name: 'Get Wave Master Property (Tesseract)', 
                    pattern: '/tesseract/waves/{wave_id}/master_property/{property_value}', 
                    example: '/tesseract/waves/WAV123456/master_property/client_name',
                    description: '🏷️ Get master properties by wave using Tesseract'
                },

                // === MISCELLANEOUS ENDPOINTS ===
                { 
                    name: 'Omnisearch Projects/Studies', 
                    pattern: '/omnisearch', 
                    example: '/omnisearch?search=consumer%20insights',
                    description: '🔍 Perform project/study wide search'
                },
                { 
                    name: 'Get List Source Items', 
                    pattern: '/lists_source/{list}', 
                    example: '/lists_source/countries',
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
                    example: '/tesseract/studies/STU123456/master_property/client_name',
                    description: '🔧 Get study master properties using Tesseract'
                },
                { 
                    name: 'Get Study Simple Settings Metadata (Tesseract)', 
                    pattern: '/tesseract/studies/{study_id}/simple_settings_meta', 
                    example: '/tesseract/studies/STU123456/simple_settings_meta',
                    description: '⚙️ Get study simple settings metadata using Tesseract'
                },
                { 
                    name: 'Get Simple Settings by Product Type (Tesseract)', 
                    pattern: '/tesseract/projects/{project_id}/simple_settings_meta/{product_type_id}', 
                    example: '/tesseract/projects/PRJ123456/simple_settings_meta/PROD_TYPE_01',
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
                { 
                    name: 'Post Event Test', 
                    pattern: '/postevent', 
                    example: '/postevent',
                    description: '🧪 Returns post test event for this service'
                },
                { 
                    name: 'Rollback Service', 
                    pattern: '/rollback', 
                    example: '/rollback',
                    description: '🔄 Force a rollback from the current version'
                },
                { 
                    name: 'Current User Country', 
                    pattern: '/currentuser/country', 
                    example: '/currentuser/country',
                    description: '🌎 Get current user country information'
                },
                { 
                    name: 'FGL On', 
                    pattern: '/FGL/On', 
                    example: '/FGL/On',
                    description: '🟢 Turn on FGL for one hour'
                },
                { 
                    name: 'FGL Off', 
                    pattern: '/FGL/Off', 
                    example: '/FGL/Off',
                    description: '🔴 Turn off FGL for this service'
                },
                { 
                    name: 'OpenAPI Documentation', 
                    pattern: '/openapi.json', 
                    example: '/openapi.json',
                    description: '📖 Get the OpenAPI specification documentation'
                },

                // === ERROR QUERY MODULE ===
                { 
                    name: 'Get All Errors', 
                    pattern: '/Errors', 
                    example: '/Errors',
                    description: '❌ Returns all the errors as HTML page'
                },
                { 
                    name: 'Get and Clear Errors', 
                    pattern: '/Errors/Clear', 
                    example: '/Errors/Clear',
                    description: '🧹 Returns all errors and clears them'
                },

                // === WAVE API MODULE ===
                { 
                    name: 'Wave All Questions', 
                    pattern: '/waves/{wave_id}/all-questions', 
                    example: '/waves/W123456/all-questions',
                    description: '❓ Returns all the wave questions'
                },
                { 
                    name: 'Wave All Questions Combined', 
                    pattern: '/waves/{wave_id}/all-questions-combined', 
                    example: '/waves/W123456/all-questions-combined',
                    description: '🔗 Returns all the wave questions combined'
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
                    name: 'Product Text Replacements', 
                    pattern: '/products/{productId}/text_replacements', 
                    example: '/products/PROD123/text_replacements?language=en',
                    description: '🏷️ Returns text replacements for a product by language'
                },
                { 
                    name: 'Wave List Replacements', 
                    pattern: '/waves/{wave_id}/list_replacements', 
                    example: '/waves/W123456/list_replacements',
                    description: '📋 Returns list replacements for a wave'
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
                    name: 'Wave Specific Quota', 
                    pattern: '/waves/{wave_id}/quotas/{quota_id}', 
                    example: '/waves/W123456/quotas/QUOTA_001',
                    description: '🎯 Returns a specific quota definition for a wave'
                },
                { 
                    name: 'Wave Qlib Content', 
                    pattern: '/waves/{wave_id}/qlibcontent', 
                    example: '/waves/W123456/qlibcontent',
                    description: '📚 Returns the qlib content for a wave'
                },
                { 
                    name: 'Wave Questionnaire Version', 
                    pattern: '/waves/{wave_id}/questionnaire-version', 
                    example: '/waves/W123456/questionnaire-version',
                    description: '🔢 Returns the questionnaire version for a wave'
                },
                { 
                    name: 'Wave Quotable Questions', 
                    pattern: '/waves/{wave_id}/quotable-questions', 
                    example: '/waves/W123456/quotable-questions',
                    description: '💬 Returns quotable questions for a wave'
                },
                { 
                    name: 'Wave Subgroup Questions', 
                    pattern: '/waves/{wave_id}/subgroup-questions', 
                    example: '/waves/W123456/subgroup-questions',
                    description: '👥 Returns single/multi coded questions for wave'
                },
                { 
                    name: 'Wave Boostable Questions', 
                    pattern: '/waves/{wave_id}/boostable-questions', 
                    example: '/waves/W123456/boostable-questions',
                    description: '🚀 Returns boostable questions for wave'
                },
                { 
                    name: 'Wave Details', 
                    pattern: '/waves/{wave_id}/qf', 
                    example: '/waves/W123456/qf',
                    description: '📄 Returns all the details for a wave'
                },
                { 
                    name: 'Wave Media', 
                    pattern: '/waves/{wave_id}/media', 
                    example: '/waves/W123456/media',
                    description: '🎬 Returns the media for a wave'
                },
                { 
                    name: 'Wave Qlib Update Status', 
                    pattern: '/waves/{wave_id}/qlib-update-status', 
                    example: '/waves/W123456/qlib-update-status',
                    description: '⏱️ Returns the qlib update status for a wave'
                },
                { 
                    name: 'Wave EyeSquare Metadata', 
                    pattern: '/waves/{wave_id}/eye-square-metadata', 
                    example: '/waves/W123456/eye-square-metadata',
                    description: '👁️ Returns eyeSquare metadata for a wave'
                },

                // === CUSTOM QUESTIONS API MODULE ===
                { 
                    name: 'Wave Custom Questions', 
                    pattern: '/waves/{wave_id}/refresh/{refresh}/custom-questions', 
                    example: '/waves/W123456/refresh/true/custom-questions',
                    description: '🎨 Returns the Custom Questions for a wave'
                },
                { 
                    name: 'Wave Short Custom Questions', 
                    pattern: '/waves/{wave_id}/short-custom-questions', 
                    example: '/waves/W123456/short-custom-questions',
                    description: '📝 Returns the short Custom Questions for a wave'
                },

                // === WEIGHTABLE QUESTIONS API MODULE ===
                { 
                    name: 'Wave Weightable Questions', 
                    pattern: '/waves/{wave_id}/weightable-questions', 
                    example: '/waves/W123456/weightable-questions',
                    description: '⚖️ Returns the Weightable Questions for a wave'
                },

                // === QUESTIONNAIRE EXPORT API MODULE ===
                { 
                    name: 'QVersion Qlib Content', 
                    pattern: '/{qlib_questionnaire_version_id}/qlibcontent', 
                    example: '/12345/qlibcontent',
                    description: '📖 Returns qlib content for questionnaire version'
                },

                // === QUESTIONNAIRE FACTORY API MODULE ===
                { 
                    name: 'Product Template by ID', 
                    pattern: '/producttemplates/{qlib_producttemplate_id}', 
                    example: '/producttemplates/TEMPLATE123?languages=en&languages=es',
                    description: '🏭 Returns a Product Template by ID'
                },
                { 
                    name: 'Product Templates List', 
                    pattern: '/producttemplateslist', 
                    example: '/producttemplateslist',
                    description: '📋 Returns the complete product templates list'
                },
                { 
                    name: 'QVersion Product Template', 
                    pattern: '/questionnaires-versions/{qlib_questionnaire_version_id}/producttemplate', 
                    example: '/questionnaires-versions/12345/producttemplate',
                    description: '🎭 Returns product template for questionnaire version'
                },
                { 
                    name: 'QVersion Product Template Modules', 
                    pattern: '/questionnaires-versions/{qlib_questionnaire_version_id}/producttemplate/{qlib_producttemplate_id}/modules', 
                    example: '/questionnaires-versions/12345/producttemplate/TEMPLATE123/modules',
                    description: '🧩 Returns modules for a product template'
                },
                { 
                    name: 'QVersion Product Template Text Replacement', 
                    pattern: '/questionnaires-versions/{qlib_questionnaire_version_id}/producttemplate/{qlib_producttemplate_id}/textreplacement', 
                    example: '/questionnaires-versions/12345/producttemplate/TEMPLATE123/textreplacement',
                    description: '📝 Returns text replacements for a product template'
                },
                { 
                    name: 'QVersion Product Template Module Questions', 
                    pattern: '/questionnaires-versions/{qlib_questionnaire_version_id}/producttemplate/{qlib_producttemplate_id}/module-questions', 
                    example: '/questionnaires-versions/12345/producttemplate/TEMPLATE123/module-questions',
                    description: '❓ Returns module questions for a product template'
                },
                { 
                    name: 'QVersion Product Template List Replacements', 
                    pattern: '/questionnaires-versions/{qlib_questionnaire_version_id}/producttemplate/{qlib_producttemplate_id}/listreplacement', 
                    example: '/questionnaires-versions/12345/producttemplate/TEMPLATE123/listreplacement',
                    description: '📋 Returns list replacements for a product template'
                },
                { 
                    name: 'QVersion All Quotas', 
                    pattern: '/questionnaires-versions/{qlib_questionnaire_version_id}/quotas', 
                    example: '/questionnaires-versions/12345/quotas',
                    description: '📊 Returns all quotas for questionnaire version'
                },
                { 
                    name: 'QVersion Specific Quota', 
                    pattern: '/questionnaires-versions/{qlib_questionnaire_version_id}/quotas/{quota_id}', 
                    example: '/questionnaires-versions/12345/quotas/QUOTA_001',
                    description: '🎯 Returns a specific quota for questionnaire version'
                },
                { 
                    name: 'QVersion Quotas Export', 
                    pattern: '/questionnaires-versions/{qlib_questionnaire_version_id}/quotas-export', 
                    example: '/questionnaires-versions/12345/quotas-export',
                    description: '📤 Returns quota export for questionnaire version'
                },
                { 
                    name: 'QVersion Quotas Export NField', 
                    pattern: '/questionnaires-versions/{qlib_questionnaire_version_id}/quotas-export-nfield', 
                    example: '/questionnaires-versions/12345/quotas-export-nfield',
                    description: '🏢 Returns NField quota export for questionnaire version'
                },
                { 
                    name: 'QVersion Dimensions Export', 
                    pattern: '/questionnaires-versions/{qlib_questionnaire_version_id}/dimensions-export', 
                    example: '/questionnaires-versions/12345/dimensions-export',
                    description: '📐 Returns dimensions export for questionnaire version'
                },

                // === SAMPLE DEFINITION API MODULE ===
                { 
                    name: 'Sample Definition by ID', 
                    pattern: '/sample_definition/{sampledefinitionid}', 
                    example: '/sample_definition/12345',
                    description: '🔬 Returns sample definition by ID'
                },
                { 
                    name: 'Sample Definition by Product', 
                    pattern: '/sample_definitions/{product_name}', 
                    example: '/sample_definitions/MyProduct',
                    description: '🏷️ Returns sample definition for a product'
                }
            ]
        }
    };

    // 🔥 EJEMPLOS JSONPATH ACTUALIZADOS
    const examples: JsonPathExample[] = [
        { name: 'Root Object', query: '$', description: 'Returns the entire JSON object' },
        { name: 'All Data Items', query: '$.data[*]', description: 'All items in data array' },
        { name: 'First Data Item', query: '$.data[0]', description: 'First item in data array' },
        { name: 'All Questions', query: '$.questions[*]', description: 'All questions in the response' },
        { name: 'Question Names', query: '$.questions[*].name', description: 'Get all question names' },
        { name: 'Wave ID', query: '$.wave_id', description: 'Get wave identifier' },
        { name: 'Service Status', query: '$.status', description: 'Get service status' },
        { name: 'Version Number', query: '$.version', description: 'Get version information' }
    ];

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
    // FUNCIÓN PRINCIPAL PARA DATOS REALES
    // ================================
    const executeRealApiRequest = async (): Promise<void> => {
        if (!token.trim()) {
            setMessage('❌ Please enter a valid dev token');
            return;
        }

        if (!endpoint.trim()) {
            setMessage('❌ Please enter an endpoint');
            return;
        }

        setIsLoading(true);
        setMessage('🔄 Making real API request...');

        try {
            // Crear el objeto request que espera el comando Rust
            const requestData = {
                environment,
                service: selectedService,
                endpoint,
                token,
                jsonpath_query: jsonPathQuery
            };

            console.log('🚀 Executing real API request:', requestData);

            // Enviar como parámetro nombrado 'request'
            const response = await invoke<ApiResponse>('execute_jsonpath_query', {
                request: requestData
            });

            console.log('📥 API Response:', response);

            if (response.success) {
                setApiResponse(response.raw_response || '');
                setJsonPathResult(response.jsonpath_result || '');
                setMessage(`✅ Request successful (${response.execution_time_ms}ms) - ${response.url_used}`);
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

    const validateJsonPath = async (): Promise<void> => {
        if (!apiResponse || !jsonPathQuery.trim()) {
            setMessage('❌ Need both API response and JSONPath query');
            return;
        }

        try {
            const result = await invoke<string>('validate_jsonpath_query', {
                json_text: apiResponse,
                query: jsonPathQuery
            });
            setJsonPathResult(result);
            setMessage('✅ JSONPath applied successfully');
        } catch (error) {
            setJsonPathResult(`JSONPath Error: ${error}`);
            setMessage(`❌ JSONPath failed: ${error}`);
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

    const useExample = (example: JsonPathExample): void => {
        setJsonPathQuery(example.query);
        if (apiResponse) {
            setTimeout(() => validateJsonPath(), 300);
        }
    };

    // 🔥 FUNCIÓN PARA USAR TEMPLATE
    const useTemplate = (template: any): void => {
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
                                <div className="examples-container">
                                    {availableServices[selectedService]?.templates.map((template, index) => (
                                        <button
                                            key={index}
                                            onClick={() => useTemplate(template)}
                                            className="example-btn"
                                            title={template.description}
                                        >
                                            <div className="example-query">{template.pattern}</div>
                                            <div className="example-name">{template.name}</div>
                                        </button>
                                    ))}
                                </div>
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
                                    onChange={(e) => {
                                        setJsonPathQuery(e.target.value);
                                        if (apiResponse) {
                                            setTimeout(() => validateJsonPath(), 300);
                                        }
                                    }}
                                    placeholder="$.data[*]"
                                    className="form-input"
                                />
                            </div>

                            {/* JSONPath Examples */}
                            <div className="form-group">
                                <label className="form-label">JSONPath Examples</label>
                                <div className="examples-container">
                                    {examples.map((example, index) => (
                                        <button
                                            key={index}
                                            onClick={() => useExample(example)}
                                            className="example-btn"
                                            title={example.description}
                                        >
                                            <div className="example-query">{example.query}</div>
                                            <div className="example-name">{example.name}</div>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Action Buttons */}
                            <div className="action-buttons">
                                <button
                                    onClick={executeRealApiRequest}
                                    disabled={!token.trim() || isLoading}
                                    className="execute-btn"
                                >
                                    <Icon emoji={isLoading ? "⏳" : "🚀"} size={16} />
                                    {isLoading ? 'Loading...' : 'Execute'}
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