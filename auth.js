// auth.js - Version simple et fonctionnelle

// Configuration Supabase
const SUPABASE_URL = 'https://oypihdbuovijjutuyqaj.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im95cGloZGJ1b3Zpamp1dHV5cWFqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEwMjEwNzIsImV4cCI6MjA4NjU5NzA3Mn0.j3ZXmUYoXtV6rKh7f4_QdrttxSDCTE1khIkV0dHGp4s';

// ✅ Initialisation CORRECTE
const { createClient } = supabase;
const novabank = createClient(SUPABASE_URL, SUPABASE_KEY);

// ==================== FONCTIONS SIMPLES ====================

// Inscription
async function register(nom, email, identite, password) {
    try {
        const { data, error } = await novabank.auth.signUp({
            email: email,
            password: password,
            options: {
                data: {
                    nom: nom,
                    numero_identite: identite.replace(/\s/g, '').toUpperCase()
                }
            }
        });
        
        if (error) throw error;
        return { success: true, user: data.user };
    } catch (error) {
        return { success: false, message: error.message };
    }
}

// Connexion
async function login(email, password) {
    try {
        const { data, error } = await novabank.auth.signInWithPassword({
            email: email,
            password: password
        });
        
        if (error) throw error;
        return { success: true, user: data.user };
    } catch (error) {
        let message = 'Erreur de connexion';
        if (error.message.includes('Invalid login')) message = 'Email ou mot de passe incorrect';
        return { success: false, message: message };
    }
}

// Déconnexion
async function logout() {
    await novabank.auth.signOut();
    window.location.href = 'connexion.html';
}

// Vérifier si connecté
async function isAuthenticated() {
    const { data: { user } } = await novabank.auth.getUser();
    return !!user;
}

// Récupérer le profil
async function getProfile() {
    const { data: { user } } = await novabank.auth.getUser();
    if (!user) return null;
    
    const { data } = await novabank
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
    
    return data;
}

// Vérifier si admin
async function isAdmin() {
    const profile = await getProfile();
    return profile?.role === 'admin';
}

// ==================== EXPORT ====================
window.novabank = {
    register,
    login,
    logout,
    isAuthenticated,
    getProfile,
    isAdmin
};

console.log('✅ Auth.js prêt');