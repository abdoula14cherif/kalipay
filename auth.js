// auth.js - Fichier centralisé pour la gestion de l'authentification NOVA BANK

// Configuration Supabase
const SUPABASE_URL = 'https://oypihdbuovijjutuyqaj.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im95cGloZGJ1b3Zpamp1dHV5cWFqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEwMjEwNzIsImV4cCI6MjA4NjU5NzA3Mn0.j3ZXmUYoXtV6rKh7f4_QdrttxSDCTE1khIkV0dHGp4s';

// ✅ CORRECTION: Initialisation correcte de Supabase
const { createClient } = supabase;
const _supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// ==================== GESTION DES UTILISATEURS ====================

/**
 * Inscription d'un nouvel utilisateur
 * @param {Object} userData - Données de l'utilisateur
 * @param {string} userData.nom - Nom complet
 * @param {string} userData.email - Email
 * @param {string} userData.identite - Numéro de carte d'identité
 * @param {string} userData.password - Mot de passe
 * @returns {Promise<Object>} - Résultat de l'inscription
 */
async function registerUser(userData) {
    try {
        const { nom, email, identite, password } = userData;
        
        // Nettoyer le numéro d'identité
        const cleanIdentite = identite.replace(/\s/g, '').toUpperCase();
        
        // Inscription avec Supabase
        const { data, error } = await _supabase.auth.signUp({
            email: email,
            password: password,
            options: {
                data: {
                    nom: nom,
                    numero_identite: cleanIdentite
                }
            }
        });

        if (error) throw error;

        if (data && data.user) {
            // Attendre que le trigger crée le profil
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            return {
                success: true,
                user: data.user,
                message: 'Inscription réussie'
            };
        }

        return {
            success: false,
            message: 'Erreur lors de l\'inscription'
        };

    } catch (error) {
        console.error('Erreur registerUser:', error);
        return {
            success: false,
            message: error.message || 'Erreur lors de l\'inscription'
        };
    }
}

/**
 * Connexion d'un utilisateur
 * @param {string} email - Email de l'utilisateur
 * @param {string} password - Mot de passe
 * @returns {Promise<Object>} - Résultat de la connexion
 */
async function loginUser(email, password) {
    try {
        const { data, error } = await _supabase.auth.signInWithPassword({
            email: email,
            password: password
        });

        if (error) throw error;

        if (data && data.user) {
            return {
                success: true,
                user: data.user,
                session: data.session,
                message: 'Connexion réussie'
            };
        }

        return {
            success: false,
            message: 'Erreur lors de la connexion'
        };

    } catch (error) {
        console.error('Erreur loginUser:', error);
        
        // Messages d'erreur personnalisés
        let message = 'Erreur lors de la connexion';
        if (error.message.includes('Invalid login credentials')) {
            message = 'Email ou mot de passe incorrect';
        } else if (error.message.includes('Email not confirmed')) {
            message = 'Veuillez confirmer votre email';
        } else if (error.message.includes('rate limit')) {
            message = 'Trop de tentatives, réessayez plus tard';
        }
        
        return {
            success: false,
            message: message
        };
    }
}

/**
 * Déconnexion de l'utilisateur
 * @returns {Promise<Object>} - Résultat de la déconnexion
 */
async function logoutUser() {
    try {
        const { error } = await _supabase.auth.signOut();
        if (error) throw error;
        
        return {
            success: true,
            message: 'Déconnexion réussie'
        };
    } catch (error) {
        console.error('Erreur logoutUser:', error);
        return {
            success: false,
            message: error.message || 'Erreur lors de la déconnexion'
        };
    }
}

// ==================== GESTION DES PROFILS ====================

/**
 * Récupérer le profil de l'utilisateur connecté
 * @returns {Promise<Object>} - Profil utilisateur
 */
async function getUserProfile() {
    try {
        const { data: { user }, error: userError } = await _supabase.auth.getUser();
        
        if (userError) throw userError;
        if (!user) throw new Error('Utilisateur non connecté');

        const { data, error } = await _supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single();

        if (error) throw error;

        return {
            success: true,
            profile: data
        };

    } catch (error) {
        console.error('Erreur getUserProfile:', error);
        return {
            success: false,
            message: error.message || 'Erreur lors du chargement du profil'
        };
    }
}

/**
 * Vérifier si l'utilisateur est admin
 * @returns {Promise<boolean>}
 */
async function isAdmin() {
    try {
        const { data: { user } } = await _supabase.auth.getUser();
        if (!user) return false;
        
        const { data, error } = await _supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single();
        
        if (error || !data) return false;
        
        return data.role === 'admin';
    } catch {
        return false;
    }
}

// ==================== UTILITAIRES ====================

/**
 * Vérifier si l'utilisateur est connecté
 * @returns {Promise<boolean>}
 */
async function isAuthenticated() {
    try {
        const { data: { user } } = await _supabase.auth.getUser();
        return !!user;
    } catch {
        return false;
    }
}

/**
 * Récupérer l'utilisateur connecté
 * @returns {Promise<Object|null>}
 */
async function getCurrentUser() {
    try {
        const { data: { user } } = await _supabase.auth.getUser();
        return user;
    } catch {
        return null;
    }
}

/**
 * Rediriger si non connecté
 * @param {string} redirectUrl - URL de redirection
 */
async function requireAuth(redirectUrl = 'connexion.html') {
    const authenticated = await isAuthenticated();
    if (!authenticated) {
        window.location.href = redirectUrl;
    }
}

/**
 * Rediriger si déjà connecté
 * @param {string} redirectUrl - URL de redirection
 */
async function redirectIfAuthenticated(redirectUrl = 'dashboard.html') {
    const authenticated = await isAuthenticated();
    if (authenticated) {
        window.location.href = redirectUrl;
    }
}

/**
 * Formater le numéro d'identité
 * @param {string} value - Valeur à formater
 * @returns {string}
 */
function formatIdentite(value) {
    let cleaned = value.toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (cleaned.length > 2) {
        cleaned = cleaned.slice(0, 2) + ' ' + cleaned.slice(2, 9);
    }
    return cleaned;
}

/**
 * Calculer la force du mot de passe
 * @param {string} password - Mot de passe
 * @returns {Object} - Force et couleur
 */
function checkPasswordStrength(password) {
    let strength = 0;
    
    if (password.length >= 8) strength += 20;
    if (password.match(/[a-z]/)) strength += 20;
    if (password.match(/[A-Z]/)) strength += 20;
    if (password.match(/[0-9]/)) strength += 20;
    if (password.match(/[^a-zA-Z0-9]/)) strength += 20;

    let text = 'Très faible';
    let color = '#ff5252';
    
    if (strength <= 20) {
        text = 'Très faible';
        color = '#ff5252';
    } else if (strength <= 40) {
        text = 'Faible';
        color = '#ff8c42';
    } else if (strength <= 60) {
        text = 'Moyen';
        color = '#ff8c42';
    } else if (strength <= 80) {
        text = 'Bon';
        color = '#2d9c5c';
    } else {
        text = 'Excellent';
        color = '#2d9c5c';
    }

    return {
        strength: strength,
        text: text,
        color: color
    };
}

// ==================== EXPORTS ====================

// Exporter toutes les fonctions
window.NOVABANK = {
    // Authentification
    register: registerUser,
    login: loginUser,
    logout: logoutUser,
    
    // Profils
    getProfile: getUserProfile,
    isAdmin: isAdmin,
    
    // Utilitaires
    isAuthenticated: isAuthenticated,
    getCurrentUser: getCurrentUser,
    requireAuth: requireAuth,
    redirectIfAuthenticated: redirectIfAuthenticated,
    formatIdentite: formatIdentite,
    checkPasswordStrength: checkPasswordStrength,
    
    // Constantes
    supabase: _supabase
};

console.log('✅ Auth.js chargé - NOVA BANK');