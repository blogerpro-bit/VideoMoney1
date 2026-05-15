// Stockage local
const STORAGE_KEY = 'videomoney_data';

function getData() {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : { users: [], videos: [], currentUser: null };
}

function saveData(data) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

// Inscription
document.getElementById('registerForm')?.addEventListener('submit', function(e) {
    e.preventDefault();
    const data = getData();
    const email = document.getElementById('email').value;
    if (data.users.find(u => u.email === email)) {
        alert('Cet email est déjà utilisé');
        return;
    }
    const newUser = {
        id: Date.now(),
        fullname: document.getElementById('fullname').value,
        email: email,
        phone: document.getElementById('phone').value,
        password: document.getElementById('password').value,
        balance: 0,
        totalViews: 0,
        totalEarnings: 0
    };
    data.users.push(newUser);
    data.currentUser = newUser.id;
    saveData(data);
    alert('Compte créé avec succès !');
    window.location.href = 'dashboard.html';
});

// Connexion
document.getElementById('loginForm')?.addEventListener('submit', function(e) {
    e.preventDefault();
    const data = getData();
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const user = data.users.find(u => u.email === email && u.password === password);
    if (!user) {
        alert('Email ou mot de passe incorrect');
        return;
    }
    data.currentUser = user.id;
    saveData(data);
    window.location.href = 'dashboard.html';
});

// Dashboard
if (window.location.pathname.includes('dashboard.html')) {
    const data = getData();
    const user = data.users.find(u => u.id === data.currentUser);
    if (!user) { window.location.href = 'login.html'; return; }
    document.getElementById('totalViews').textContent = user.totalViews || 0;
    document.getElementById('totalEarnings').textContent = (user.totalEarnings || 0) + ' XAF';
    document.getElementById('availableBalance').textContent = (user.balance || 0) + ' XAF';
    
    const userVideos = data.videos.filter(v => v.userId === user.id);
    const container = document.getElementById('myVideos');
    if (userVideos.length > 0) {
        container.innerHTML = userVideos.map(v => `
            <div style="background: #1a1a2a; padding: 16px; border-radius: 8px; margin-bottom: 12px;">
                <a href="video.html?id=${v.id}" style="color: #fff; text-decoration: none; font-size: 18px;">${v.title}</a>
                <p style="color: #888; margin-top: 8px;">${v.views || 0} vues | ${(v.views || 0) * 0.5} XAF</p>
            </div>
        `).join('');
    }
}

// Upload
document.getElementById('uploadForm')?.addEventListener('submit', function(e) {
    e.preventDefault();
    const data = getData();
    const user = data.users.find(u => u.id === data.currentUser);
    if (!user) { window.location.href = 'login.html'; return; }
    
    const title = document.getElementById('videoTitle').value;
    const fileInput = document.getElementById('videoFile');
    const file = fileInput.files[0];
    
    if (!file) { alert('Veuillez sélectionner une vidéo'); return; }
    
    const reader = new FileReader();
    reader.onload = function(e) {
        const newVideo = {
            id: Date.now(),
            userId: user.id,
            title: title,
            data: e.target.result,
            views: Math.floor(Math.random() * 50),
            date: new Date().toISOString()
        };
        data.videos.push(newVideo);
        saveData(data);
        alert('Vidéo publiée avec succès !');
        window.location.href = 'dashboard.html';
    };
    reader.readAsDataURL(file);
});

// Drag & drop
const dropZone = document.getElementById('dropZone');
const fileInput = document.getElementById('videoFile');
if (dropZone && fileInput) {
    dropZone.addEventListener('click', () => fileInput.click());
    dropZone.addEventListener('dragover', (e) => { e.preventDefault(); dropZone.style.borderColor = '#00d4aa'; });
    dropZone.addEventListener('dragleave', () => dropZone.style.borderColor = '#2a2a3a');
    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.style.borderColor = '#2a2a3a';
        if (e.dataTransfer.files.length) {
            fileInput.files = e.dataTransfer.files;
            dropZone.querySelector('p').textContent = e.dataTransfer.files[0].name;
        }
    });
}

// Lecture vidéo
if (window.location.pathname.includes('video.html')) {
    const params = new URLSearchParams(window.location.search);
    const videoId = parseInt(params.get('id'));
    const data = getData();
    const video = data.videos.find(v => v.id === videoId);
    if (!video) { document.body.innerHTML = '<p style="text-align:center;padding:40px;">Vidéo introuvable</p>'; return; }
    
    document.getElementById('videoTitle').textContent = video.title;
    const player = document.getElementById('videoPlayer');
    player.src = video.data;
    
    player.addEventListener('play', function() {
        video.views = (video.views || 0) + 1;
        const user = data.users.find(u => u.id === video.userId);
        if (user) {
            const earnings = 0.5;
            user.totalViews = (user.totalViews || 0) + 1;
            user.totalEarnings = (user.totalEarnings || 0) + earnings;
            user.balance = (user.balance || 0) + earnings;
        }
        saveData(data);
        document.getElementById('videoStats').textContent = `${video.views} vues | ${(video.views * 0.5).toFixed(1)} XAF gagnés`;
    });
}

// Withdraw - PAIEMENT NOTCHPAY
document.getElementById('withdrawForm')?.addEventListener('submit', async function(e) {
    e.preventDefault();
    const data = getData();
    const user = data.users.find(u => u.id === data.currentUser);
    if (!user) { window.location.href = 'login.html'; return; }

    // ==== METS TA CLÉ NOTCHPAY ICI ====
    const NOTCHPAY_PUBLIC_KEY = 'pk_test_...';
    
    const method = document.getElementById('paymentMethod').value;
    const phone = document.getElementById('phoneNumber').value;
    const amount = parseInt(document.getElementById('withdrawAmount').value);
    const fullName = document.getElementById('fullName').value;
    const statusDiv = document.getElementById('paymentStatus');

    if (amount < 500) { alert('Le montant minimum est de 500 XAF'); return; }
    if (amount > (user.balance || 0)) { alert('Solde insuffisant'); return; }

    statusDiv.innerHTML = '<p style="color: #ffa500;">Traitement du paiement en cours...</p>';

    try {
        const response = await fetch('https://api.notchpay.co/v1/charges', {
            method: 'POST',
            headers: {
                'Authorization': 'Bearer ' + NOTCHPAY_PUBLIC_KEY,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                amount: amount,
                currency: 'XAF',
                description: 'Retrait VidéoMoney - ' + user.fullname,
                callback_url: window.location.origin + '/dashboard.html',
                customer: {
                    name: fullName,
                    email: user.email,
                    phone: phone
                },
                channels: [method]
            })
        });

        const result = await response.json();
        
        if (result.status === 'pending' || result.status === 'success') {
            // Déduire le solde
            user.balance -= amount;
            saveData(data);
            
            statusDiv.innerHTML = `
                <div style="background: #00aa00; padding: 16px; border-radius: 8px; margin-top: 16px;">
                    <p style="color: #fff; font-weight: bold;">✅ Paiement initié !</p>
                    <p style="color: #ddd;">${amount} XAF vers ${phone} (${method === 'cm.orange' ? 'Orange Money' : 'MTN Mobile Money'})</p>
                    <p style="color: #ddd;">Référence: ${result.transaction?.reference || result.reference || 'N/A'}</p>
                    <p style="color: #ddd;">Statut: ${result.status}</p>
                </div>
            `;
            document.getElementById('withdrawBalance').textContent = user.balance + ' XAF';
        } else {
            statusDiv.innerHTML = `<p style="color: #ff4444;">Erreur: ${result.message || 'Transaction échouée'}</p>`;
        }
    } catch (error) {
        statusDiv.innerHTML = `<p style="color: #ff4444;">Erreur de connexion: ${error.message}. Vérifie ta clé API NotchPay.</p>`;
    }
});

// Déconnexion
document.querySelector('a[href="index.html"]')?.addEventListener('click', function(e) {
    if (confirm('Déconnexion ?')) {
        const data = getData();
        data.currentUser = null;
        saveData(data);
    }
});

// Mise à jour solde sur withdraw.html
if (window.location.pathname.includes('withdraw.html')) {
    const data = getData();
    const user = data.users.find(u => u.id === data.currentUser);
    if (user) document.getElementById('withdrawBalance').textContent = (user.balance || 0) + ' XAF';
}