// --- FIREBASE KURULUMU ---
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
// YENİ: 'deleteDoc' ve 'doc' komutlarını ekledik
import { getFirestore, collection, addDoc, deleteDoc, doc, onSnapshot, query, orderBy, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// --- CONFIG AYARLARI (AYNI KALIYOR) ---
const firebaseConfig = {
  apiKey: "AIzaSyC-Cp0LuXBrMZyatcEHgssPqFvcjVPVoqQ",
  authDomain: "sanatduvari-7f82b.firebaseapp.com",
  projectId: "sanatduvari-7f82b",
  storageBucket: "sanatduvari-7f82b.firebasestorage.app",
  messagingSenderId: "840714221109",
  appId: "1:840714221109:web:6d719800885fd6160de37c"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// --- SAYAÇ AYARLARI ---
const startDate = new Date(2026, 2, 2, 12, 0o0); 

function updateCounter() {
    const now = new Date();
    const diff = now - startDate;
    if (diff < 0) return;

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
    const minutes = Math.floor((diff / (1000 * 60)) % 60);
    const seconds = Math.floor((diff / 1000) % 60);
    
    if(document.getElementById("days")) {
        document.getElementById("days").innerText = days;
        document.getElementById("hours").innerText = hours;
        document.getElementById("minutes").innerText = minutes;
        document.getElementById("seconds").innerText = seconds;
    }
}
setInterval(updateCounter, 1000);

// --- RESİM DÖNÜŞTÜRME (BASE64) ---
function resizeAndConvertToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target.result;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const maxSize = 800;
                let width = img.width;
                let height = img.height;
                
                if (width > height) {
                    if (width > maxSize) {
                        height *= maxSize / width;
                        width = maxSize;
                    }
                } else {
                    if (height > maxSize) {
                        width *= maxSize / height;
                        height = maxSize;
                    }
                }
                
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);
                resolve(canvas.toDataURL('image/jpg', 0.7)); 
            };
        };
        reader.onerror = error => reject(error);
    });
}

// --- VERİ GÖNDERME ---
window.addPoem = async function() {
    const title = document.getElementById("poemTitle").value;
    const text = document.getElementById("poemText").value;
    const fileInput = document.getElementById("imageFile");
    const file = fileInput.files[0];

    if (!title || !text) {
        alert("Başlık ve mesajı unutmayınız!");
        return;
    }

    const btn = document.querySelector("button");
    const loadingMsg = document.getElementById("loadingMsg");
    btn.disabled = true;
    btn.innerText = "İşleniyor...";
    if(loadingMsg) loadingMsg.style.display = "block";

    try {
        let finalImage = 'https://images.unsplash.com/photo-1518621736915-f3b1c41bfd00?q=80&w=1000'; 

        if (file) {
            finalImage = await resizeAndConvertToBase64(file);
        }

        await addDoc(collection(db, "poems"), {
            title: title,
            text: text,
            imageUrl: finalImage,
            createdAt: serverTimestamp()
        });
        
        document.getElementById("poemTitle").value = "";
        document.getElementById("poemText").value = "";
        fileInput.value = "";
        
    } catch (e) {
        console.error("Hata:", e);
        alert("Hata: " + e.message);
    } finally {
        btn.disabled = false;
        btn.innerText = "Duvara As ❤️";
        if(loadingMsg) loadingMsg.style.display = "none";
    }
}

// --- SİLME FONKSİYONU (YENİ) ---
window.deletePoem = async function(id) {
    // Yanlışlıkla basılırsa diye soralım
    if(confirm("Bu anıyı silmek istediğine emin misin?")) {
        try {
            await deleteDoc(doc(db, "poems", id));
            // Alert vermeye gerek yok, otomatik silinecek ekrandan
        } catch (e) {
            alert("Silinemedi: " + e.message);
        }
    }
}

// --- VERİ LİSTELEME ---
const q = query(collection(db, "poems"), orderBy("createdAt", "desc"));

onSnapshot(q, (snapshot) => {
    const list = document.getElementById("poemList");
    if(!list) return;
    list.innerHTML = ""; 

    snapshot.forEach((docSnap) => { // docSnap ismini değiştirdim karışmasın diye
        const data = docSnap.data();
        const docId = docSnap.id; // Belgenin ID'sini aldık
        
        let dateText = "Az önce";
        if(data.createdAt) {
            const date = new Date(data.createdAt.seconds * 1000);
            dateText = date.toLocaleDateString('tr-TR');
        }
        
        const html = `
        <div class="col-md-6 col-lg-4">
            <div class="card poem-card text-white shadow-lg" style="background-image: url('${data.imageUrl}'); background-size: cover; background-position: center;">
                <div class="card-overlay" style="background: rgba(0,0,0,0.5); position: absolute; top:0; left:0; width:100%; height:100%;"></div>
                
                <button onclick="deletePoem('${docId}')" class="btn btn-danger btn-sm position-absolute top-0 end-0 m-2 rounded-circle" style="z-index: 10; width: 35px; height: 35px;">
                    <i class="fas fa-trash"></i>
                </button>

                <div class="card-body d-flex flex-column justify-content-end position-relative" style="height: 350px;">
                    <h5 class="card-title fw-bold" style="text-shadow: 1px 1px 3px black;">${data.title}</h5>
                    <p class="card-text" style="text-shadow: 1px 1px 2px black;">"${data.text}"</p>
                    <small class="text-white-50">- ${dateText}</small>
                </div>
            </div>
        </div>`;
        
        list.insertAdjacentHTML('beforeend', html);
    });
});
// --- MÜZİK ÇALAR KONTROLÜ ---
// --- MÜZİK ÇALAR KONTROLÜ (MODERN EVENT LISTENER) ---
let isPlaying = false;
const audio = document.getElementById("player");
const musicIcon = document.querySelector(".music-icon");
const musicBtn = document.getElementById("musicBtn"); // HTML'den butonu buluyoruz

if (musicBtn) {
    musicBtn.addEventListener("click", function() {
        if (isPlaying) {
            audio.pause();
            musicIcon.classList.remove("playing"); // Dönmeyi durdur
            musicIcon.innerHTML = '<i class="fas fa-music"></i>'; // İkon müzik olsun
        } else {
            audio.play();
            musicIcon.classList.add("playing"); // Dönmeye başlasın
            musicIcon.innerHTML = '<i class="fas fa-pause"></i>'; // İkon pause olsun
            
            // Müzik başlayınca edebiyat sembolleri patlasın
            for(let i=0; i<10; i++) setTimeout(createLiteratureElement, i * 200);
        }
        isPlaying = !isPlaying;
    });
}

// --- UÇUŞAN EDEBİYAT ÖĞELERİ FONKSİYONU ---
function createLiteratureElement() {
    const item = document.createElement("div");
    item.classList.add("heart-rain"); 

    const symbols = [
        "<i class='fas fa-feather-pointed'></i>", 
        "<i class='fas fa-pen-nib'></i>",         
        "<i class='fas fa-book-open'></i>",       
        "<i class='fas fa-quote-left'></i>",      
        "<i class='fas fa-scroll'></i>"           
    ];
    
    item.innerHTML = symbols[Math.floor(Math.random() * symbols.length)];

    item.style.left = Math.random() * 100 + "vw";
    item.style.animationDuration = Math.random() * 3 + 5 + "s"; 
    item.style.fontSize = Math.random() * 15 + 15 + "px";
    
    const colors = ['#f5f5dc', '#d2b48c', '#ffffff', '#cccccc']; 
    item.style.color = colors[Math.floor(Math.random() * colors.length)];
    item.style.opacity = Math.random() * 0.4 + 0.2; 
    
    document.body.appendChild(item);

    setTimeout(() => {
        item.remove();
    }, 7000); 
}

setInterval(createLiteratureElement, 800); 

document.addEventListener('click', (e) => {
    // Sadece butona tıklanmadıysa obje fırlat ki kodlar çakışmasın
    if(e.target.tagName !== 'A' && e.target.tagName !== 'BUTTON') {
        createLiteratureElement();
    }
});

// --- YUMUŞAK KAYDIRMA (SMOOTH SCROLL) %100 GARANTİLİ YÖNTEM ---
// Sayfa elementlerinin tam yüklendiğinden emin olmak için minik bir gecikme ekliyoruz
setTimeout(() => {
    const scrollBtn = document.querySelector('a[href="#poetry-section"]');
    if(scrollBtn) {
        scrollBtn.addEventListener('click', function(e) {
            e.preventDefault(); // HTML'in kaba zıplamasını engeller
            
            // İlgili bölüme pürüzsüzce kaydırır
            document.querySelector('#poetry-section').scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        });
    }
}, 1000);