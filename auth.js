// auth.js - Fichier centralisé pour la gestion de l'authentification NOVA BANK

// Configuration Supabase
const SUPABASE_URL = 'https://oypihdbuovijjutuyqaj.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im95cGloZGJ1b3Zpamp1dHV5cWFqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEwMjEwNzIsImV4cCI6MjA4NjU5NzA3Mn0.j3ZXmUYoXtV6rKh7f4_QdrttxSDCTE1khIkV0dHGp4s';

// Initialisation de Supabase
const supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

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
        const { data, error } = await supabase.auth.signUp({
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
            
            // Connexion automatique après inscription
            await loginUser(email, password);
            
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
        const { data, error } = await supabase.auth.signInWithPassword({
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
        const { error } = await supabase.auth.signOut();
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
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        
        if (userError) throw userError;
        if (!user) throw new Error('Utilisateur non connecté');

        const { data, error } = await supabase
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
 * Mettre à jour le profil utilisateur
 * @param {Object} profileData - Données à mettre à jour
 * @returns {Promise<Object>} - Résultat de la mise à jour
 */
async function updateUserProfile(profileData) {
    try {
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        
        if (userError) throw userError;
        if (!user) throw new Error('Utilisateur non connecté');

        const { data, error } = await supabase
            .from('profiles')
            .update(profileData)
            .eq('id', user.id)
            .select()
            .single();

        if (error) throw error;

        return {
            success: true,
            profile: data,
            message: 'Profil mis à jour'
        };

    } catch (error) {
        console.error('Erreur updateUserProfile:', error);
        return {
            success: false,
            message: error.message || 'Erreur lors de la mise à jour'
        };
    }
}

// ==================== GESTION DES TRANSACTIONS ====================

/**
 * Créer une demande de retrait
 * @param {number} montant - Montant du retrait
 * @param {string} description - Description optionnelle
 * @returns {Promise<Object>} - Résultat de la demande
 */
async function createWithdrawRequest(montant, description = '') {
    try {
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        
        if (userError) throw userError;
        if (!user) throw new Error('Utilisateur non connecté');

        // Vérifier le solde
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('solde')
            .eq('id', user.id)
            .single();

        if (profileError) throw profileError;

        if (profile.solde < montant) {
            throw new Error('Solde insuffisant');
        }

        // Créer la transaction
        const { data, error } = await supabase
            .from('transactions')
            .insert([
                {
                    user_id: user.id,
                    type: 'retrait',
                    montant: montant,
                    description: description,
                    statut: 'en_attente',
                    documents_fournis: false
                }
            ])
            .select()
            .single();

        if (error) throw error;

        return {
            success: true,
            transaction: data,
            message: 'Demande de retrait enregistrée'
        };

    } catch (error) {
        console.error('Erreur createWithdrawRequest:', error);
        return {
            success: false,
            message: error.message || 'Erreur lors de la demande'
        };
    }
}

/**
 * Récupérer l'historique des transactions
 * @param {string} filter - Filtre (all, incoming, outgoing, pending)
 * @returns {Promise<Object>} - Liste des transactions
 */
async function getTransactions(filter = 'all') {
    try {
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        
        if (userError) throw userError;
        if (!user) throw new Error('Utilisateur non connecté');

        let query = supabase
            .from('transactions')
            .select('*')
            .eq('user_id', user.id)
            .order('date_transaction', { ascending: false });

        if (filter === 'incoming') {
            query = query.gt('montant', 0);
        } else if (filter === 'outgoing') {
            query = query.lt('montant', 0);
        } else if (filter === 'pending') {
            query = query.eq('statut', 'en_attente');
        }

        const { data, error } = await query;

        if (error) throw error;

        return {
            success: true,
            transactions: data
        };

    } catch (error) {
        console.error('Erreur getTransactions:', error);
        return {
            success: false,
            message: error.message || 'Erreur lors du chargement'
        };
    }
}

// ==================== GESTION DES DOCUMENTS ====================

/**
 * Ajouter un document à une transaction
 * @param {number} transactionId - ID de la transaction
 * @param {string} typeDocument - Type de document
 * @param {string} cheminFichier - Chemin du fichier
 * @returns {Promise<Object>} - Résultat de l'ajout
 */
async function addDocument(transactionId, typeDocument, cheminFichier) {
    try {
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        
        if (userError) throw userError;
        if (!user) throw new Error('Utilisateur non connecté');

        const { data, error } = await supabase
            .from('documents')
            .insert([
                {
                    user_id: user.id,
                    transaction_id: transactionId,
                    type_document: typeDocument,
                    chemin_fichier: cheminFichier
                }
            ])
            .select()
            .single();

        if (error) throw error;

        return {
            success: true,
            document: data,
            message: 'Document ajouté'
        };

    } catch (error) {
        console.error('Erreur addDocument:', error);
        return {
            success: false,
            message: error.message || 'Erreur lors de l\'ajout'
        };
    }
}

/**
 * Récupérer les documents d'une transaction
 * @param {number} transactionId - ID de la transaction
 * @returns {Promise<Object>} - Liste des documents
 */
async function getDocuments(transactionId) {
    try {
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        
        if (userError) throw userError;
        if (!user) throw new Error('Utilisateur non connecté');

        const { data, error } = await supabase
            .from('documents')
            .select('*')
            .eq('user_id', user.id)
            .eq('transaction_id', transactionId);

        if (error) throw error;

        return {
            success: true,
            documents: data
        };

    } catch (error) {
        console.error('Erreur getDocuments:', error);
        return {
            success: false,
            message: error.message || 'Erreur lors du chargement'
        };
    }
}

// ==================== UTILITAIRES ====================

/**
 * Vérifier si l'utilisateur est connecté
 * @returns {Promise<boolean>}
 */
async function isAuthenticated() {
    try {
        const { data: { user } } = await supabase.auth.getUser();
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
        const { data: { user } } = await supabase.auth.getUser();
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
    updateProfile: updateUserProfile,
    
    // Transactions
    createWithdraw: createWithdrawRequest,
    getTransactions: getTransactions,
    
    // Documents
    addDocument: addDocument,
    getDocuments: getDocuments,
    
    // Utilitaires
    isAuthenticated: isAuthenticated,
    getCurrentUser: getCurrentUser,
    requireAuth: requireAuth,
    redirectIfAuthenticated: redirectIfAuthenticated,
    formatIdentite: formatIdentite,
    checkPasswordStrength: checkPasswordStrength,
    
    // Constantes
    supabase: supabase
};

console.log('✅ Auth.js chargé - NOVA BANK');