import React, { useState, useEffect, useMemo, useRef } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, doc, addDoc, updateDoc, deleteDoc, onSnapshot, collection, query, setDoc } from 'firebase/firestore';
import { getStorage, ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';


// Hardcoded Firebase configuration for Vercel deployment
const firebaseConfig = {
  apiKey: "AIzaSyCDtqzovTjat0DLJ161aiEfpmKeeYn6I8",
  authDomain: "ligo-auto.firebaseapp.com",
  projectId: "ligo-auto",
  storageBucket: "ligo-auto.firebasestorage.app",
  messagingSenderId: "1038813841068",
  appId: "1:1038813841068:web:56e339aca331d66d100109"
};
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = firebaseConfig.appId;

// Helper to wrap Firestore promises with a timeout
function withTimeout<T>(promise: Promise<T>, timeoutMs = 3000): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error("Timeout")), timeoutMs))
  ]);
}

// Client-side image compression utility
const compressImage = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        
        // Resize if too large
        const MAX_DIM = 1200;
        if (width > MAX_DIM || height > MAX_DIM) {
          if (width > height) {
            height = Math.round((height * MAX_DIM) / width);
            width = MAX_DIM;
          } else {
            width = Math.round((width * MAX_DIM) / height);
            height = MAX_DIM;
          }
        }
        
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          // Compress to JPEG with 0.7 quality
          const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
          resolve(dataUrl);
        } else {
          resolve(event.target?.result as string); // Fallback to raw base64
        }
      };
      img.onerror = (err) => reject(err);
    };
    reader.onerror = (err) => reject(err);
  });
};

// Уникальные и масштабируемые SVG-иконки для идеального премиального интерфейса
const Icons = {
  Maximize: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/></svg>
  ),
  Search: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
  ),
  Filter: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon></svg>
  ),
  Lock: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
  ),
  Unlock: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 9.9-1"></path></svg>
  ),
  Calendar: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
  ),
  Gauge: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a10 10 0 0 1 10 10c0 5.523-4.477 10-10 10S2 17.523 2 12A10 10 0 0 1 12 2z"></path><path d="M12 6v6l4 2"></path></svg>
  ),
  Fuel: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="22" x2="21" y2="22"></line><path d="M4 12V4a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v8"></path><path d="M14 16H8a2 2 0 0 0-2 2v4h10v-4a2 2 0 0 0-2-2z"></path><circle cx="11" cy="7" r="1"></circle></svg>
  ),
  Activity: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline></svg>
  ),
  Plus: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
  ),
  Trash: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
  ),
  Edit: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
  ),
  X: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
  ),
  Sun: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="4"></circle><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"></path></svg>
  ),
  Moon: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"></path></svg>
  ),
  CheckBadge: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor" className="text-[#D4AF37]"><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"></path></svg>
  ),
  WhatsApp: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.003 5.324 5.328 0 11.855 0c3.161.001 6.133 1.233 8.37 3.472 2.237 2.24 3.466 5.215 3.465 8.381-.004 6.53-5.329 11.854-11.853 11.854H11.85c-2.002-.001-3.974-.531-5.741-1.542L0 24zm6.275-3.665c1.603.951 3.52 1.453 5.566 1.454h.005c5.385 0 9.764-4.379 9.767-9.767.002-2.61-1.012-5.064-2.857-6.911-1.846-1.847-4.3-2.864-6.918-2.865C6.463 2.245 2.083 6.625 2.08 12.014c-.001 2.115.553 4.184 1.607 5.962l-.993 3.623 3.638-.954zm11.082-7.531c-.302-.151-1.787-.882-2.064-.983-.277-.101-.479-.151-.68.151-.201.302-.78.983-.956 1.185-.176.201-.353.227-.655.076-1.22-.61-2.155-1.066-2.997-2.507-.222-.38.222-.353.635-1.173.076-.151.038-.283-.019-.384-.056-.101-.479-1.154-.655-1.58-.173-.414-.347-.359-.479-.365l-.409-.008c-.142 0-.374.053-.57.266-.197.212-.751.734-.751 1.79 0 1.057.77 2.079.877 2.223.107.144 1.516 2.315 3.673 3.247.513.221.913.353 1.223.452.516.164.986.141 1.357.086.414-.061 1.787-.731 2.039-1.411.252-.68.252-1.261.176-1.385-.076-.124-.277-.201-.579-.352z"/></svg>
  ),
  Clock: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
  ),
  FileText: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
  ),
  Mail: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>
  ),
  Phone: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
  ),
  ArrowLeft: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
  ),
  Sparkles: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707m0-12.728l.707.707m11.314 11.314l.707-.707M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8z"></path></svg>
  ),
  MapPin: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
  )
};

const DEMO_CARS = [
  {
    id: "demo-1",
    brand: "Porsche",
    model: "911 GT3 RS",
    year: 2023,
    km: 4800,
    price: 289000,
    fuel: "Essence",
    transmission: "Automatique",
    hp: 525,
    co2: 290,
    vin: "WP0ZZZ99ZPS240811",
    status: "En stock",
    image: "https://lh3.googleusercontent.com/aida-public/AB6AXuClvuoUxKQIu-RmKS7kxWdKDQU7g4pTofke_W29SOKrl2Q1zpfNa-82f2MdubRYVCgtf7fY3uZxofApF7_grlRusi7X1YiqOzf6sSjCkug0EyimW0dOSyFP8pzxz1Q6IN9BxQ9l893DsnYEry4D-SJB4j_K-_Y2-mnHNUltlBVqbZp1dckyEbOVDIR5oRm0eFGwKGSLWw2oSiTzS51KjpApor6UZCRhkFxe7M0U9YlAl2VUJgDiqiJN",
    description: "Состояние абсолютно идеальное. Эксклюзивная коллекционная конфигурация с пакетом Weissach, карбоно-керамическими тормозами (PCCB), системой подъема передней оси (Lift) и отделкой салона расширенной кожей/Alcantara с контрастной прострочкой цвета Racing Yellow. Активная гарантия Porsche Approved.",
    description_en: "Absolutely perfect condition. Exclusive collector configuration. Porsche Approved active warranty.",
    description_ru: "Состояние абсолютно идеальное. Эксклюзивная коллекционная конфигурация. Активная гарантия Porsche Approved.",
    verifiedVin: true
  },
  {
    id: "demo-2",
    brand: "Ferrari",
    model: "F8 Tributo",
    year: 2022,
    km: 7200,
    price: 315000,
    fuel: "Essence",
    transmission: "Automatique",
    hp: 720,
    co2: 280,
    vin: "ZFF81AHA000284561",
    status: "En stock",
    image: "https://lh3.googleusercontent.com/aida-public/AB6AXuDTbmRwZBxvLeWY9FCQrzSC13P-Qss_BKa7Qc8_ObbsE0jBoWhgUgSsrc-CVB3s0Cetf6ClQUG8gfv91j9OyK2NRGJagwp7_kRessWeAIGxAHY1iD52m8tM5_UTomP8KGb6RuhB59kky40dfd5GRULpGKRB707GiWnRtuFPhd-3YKAREzTR6dHeFGVwVTkcTzzG7ZMqPEtdpvjTUkudUZmDwZEtaOXIO8yhWzQRYg3MLEMcwWscKt1D",
    description: "Оригинальная краска Rosso Corsa с контрастной крышей Nero DS. Оснащена 20-дюймовыми коваными дисками, окрашенными в желтый цвет тормозными суппортами, гоночными сиденьями из углеродного волокна Daytona и отделкой салона карбоном. Полностью покрыта прозрачной защитной пленкой (PPF).",
    description_en: "Full options. Perfect condition.",
    description_ru: "Полная комплектация. Идеальное состояние.",
    verifiedVin: true
  },
  {
    id: "demo-3",
    brand: "Audi",
    model: "RS6 Avant Performance",
    year: 2024,
    km: 12000,
    price: 154900,
    fuel: "Hybride",
    transmission: "Automatique",
    hp: 630,
    co2: 215,
    vin: "WAUZZZ4GZPS182455",
    status: "En arrivage",
    image: "https://lh3.googleusercontent.com/aida-public/AB6AXuCUegYAhIi4Tgdh7bIIdSIHMP8BdTXPie_4Ot2mQza2NVN-2mMNXgAlZSZJEyJqf9NCRDruU3lbuCUKKPoTo44eSwyIN6Jme_aG9f7IR03ezODgtdMbvbfM57ue1gECOBoTVy50vjv3ipd0dNjg1NNosiWdIgC-Dxong1pKNojzUw8ic5Vx9Rtyf3Vh9D-cgvgzVhvGnHlH9eUo5jHBWvRZTINSiE8LiYBPcp8A_XHM5Jvl3BDRySKT",
    description: "Первый владелец. Красивейший цвет металлик Mythic Black от Audi Exclusive. Максимальная комплектация, включающая полноуправляемое шасси (подруливающие задние колеса), спортивный выхлоп RS, фары HD Matrix LED с лазерной оптикой последнего поколения и премиальную аудиосистему Bang & Olufsen Advanced 3D.",
    description_en: "Full options. Perfect condition.",
    description_ru: "Полная комплектация. Идеальное состояние.",
    verifiedVin: true
  },
  {
    id: "demo-4",
    brand: "Aston Martin",
    model: "Vantage V8 F1 Edition",
    year: 2023,
    km: 8500,
    price: 179000,
    fuel: "Essence",
    transmission: "Automatique",
    hp: 535,
    co2: 263,
    vin: "SCFKS53E8PGC02415",
    status: "En stock",
    image: "https://images.unsplash.com/photo-1606016159991-dfe4f2746ad5?auto=format&fit=crop&q=80&w=1200",
    description: "Специальная серия F1 Edition. Уникальный цвет Satin Aston Martin Racing Green. Оптимизированное шасси, специальный аэродинамический комплект, создающий дополнительную прижимную силу, и эксклюзивные 21-дюймовые диски. Активный спортивный выхлоп.",
    description_en: "Full options. Perfect condition.",
    description_ru: "Полная комплектация. Идеальное состояние.",
    verifiedVin: true
  },
  {
    id: "demo-5",
    brand: "Lamborghini",
    model: "Huracán Tecnica",
    year: 2023,
    km: 3900,
    price: 295000,
    fuel: "Essence",
    transmission: "Automatique",
    hp: 640,
    co2: 328,
    vin: "ZH1UA5ZS4NLA09812",
    status: "En stock",
    image: "https://images.unsplash.com/photo-1621135802920-133df287f89c?auto=format&fit=crop&q=80&w=1200",
    description: "Атмосферный двигатель V10 мощностью 640 лошадиных сил. Задний привод с подруливающей задней осью. Окраска кузова металлик Verde Selvans. Полный карбоновый пакет салона и экстерьера, карбоно-керамические тормоза.",
    description_en: "Full options. Perfect condition.",
    description_ru: "Полная комплектация. Идеальное состояние.",
    verifiedVin: true
  },
  {
    id: "demo-6",
    brand: "Mercedes-Benz",
    model: "AMG GT 63 S E Performance",
    year: 2022,
    km: 14500,
    price: 168000,
    fuel: "Hybride",
    transmission: "Automatique",
    hp: 843,
    co2: 180,
    vin: "WDD1903781A024105",
    status: "En stock",
    image: "https://images.unsplash.com/photo-1618843479313-40f8afb4b4d8?auto=format&fit=crop&q=80&w=1200",
    description: "Гибридная технология E Performance, заимствованная из Формулы-1. Суммарная мощность 843 л.с. Матовый цвет Gris Sélénite Magno designo (матовый). Панорамный люк, высокоэффективная тормозная система AMG из керамики.",
    description_en: "Full options. Perfect condition.",
    description_ru: "Полная комплектация. Идеальное состояние.",
    verifiedVin: true
  },
  {
    id: "demo-7",
    brand: "Bentley",
    model: "Continental GT V8 Mulliner",
    year: 2021,
    km: 19800,
    price: 225000,
    fuel: "Essence",
    transmission: "Automatique",
    hp: 550,
    co2: 268,
    vin: "SCBGD4ZG8MC084155",
    status: "En stock",
    image: "https://images.unsplash.com/photo-1580273916550-e323be2ae537?auto=format&fit=crop&q=80&w=1200",
    description: "Эксклюзивная отделка Mulliner. Салон из стеганой кожи ручной работы с двойным ромбовидным узором. Окраска кузова Onyx Black. Аудиосистема Naim для Bentley исключительной точности звучания, активная адаптивная пневмоподвеска Bentley Dynamic Ride.",
    description_en: "Full options. Perfect condition.",
    description_ru: "Полная комплектация. Идеальное состояние.",
    verifiedVin: true
  },
  {
    id: "demo-8",
    brand: "Maserati",
    model: "MC20 Cielo",
    year: 2023,
    km: 2100,
    price: 245000,
    fuel: "Essence",
    transmission: "Automatique",
    hp: 630,
    co2: 262,
    vin: "ZAM82CMA0P1028456",
    status: "En stock",
    image: "https://images.unsplash.com/photo-1511919884226-fd3cad34687c?auto=format&fit=crop&q=80&w=1200",
    description: "Версия Spyder Cielo с умной электрохромной стеклянной крышей. Двигатель V6 Nettuno с двойным сгоранием, созданный на основе технологий F1. Цвет кузова Acquamarina. Сверхлегкий монокок из углеродного волокна.",
    verifiedVin: true
  }
];

export default function App() {
  // Theme state synced with localStorage, defaulting to 'light'
  const [theme, setTheme] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('theme');
      return saved || 'light';
    }
    return 'light';
  });

  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  // Dynamic theme-aware SVG fallback builder
  const getFallbackSvg = (width = 800, height = 500, fontSize = 24, letterSpacing = 3) => {
    const isDark = theme === 'dark';
    const bgFill = isDark ? '%23121214' : '%23F8F9FA';
    const borderStroke = isDark ? '%23D4AF37' : '%23C5A059';
    const textFill = isDark ? '%23D4AF37' : '%23C5A059';
    const strokeOpacity = isDark ? '0.3' : '0.2';
    
    return `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><rect width="100%" height="100%" fill="${bgFill}"/><rect x="${width*0.01}" y="${height*0.01}" width="${width*0.98}" height="${height*0.98}" fill="none" stroke="${borderStroke}" stroke-width="${width > 600 ? 2 : 1}" opacity="${strokeOpacity}"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-family="serif" font-size="${fontSize}" font-weight="bold" fill="${textFill}" letter-spacing="${letterSpacing}">LIGO AUTOMOBILES</text></svg>`;
  };



  // Аутентификация и облачные пользователи
  const [user, setUser] = useState(null);
  
  // Данные каталога автомобилей
  const [cars, setCars] = useState(DEMO_CARS);
  const [loading, setLoading] = useState(false);
  const [globalError, setGlobalError] = useState(null);

  // Кастомная система нотификаций (без алертов)
  const [notification, setNotification] = useState(null);

  // Фильтрация
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBrand, setSelectedBrand] = useState('');
  const [selectedModel, setSelectedModel] = useState('');
  const [priceMin, setPriceMin] = useState('');
  const [priceMax, setPriceMax] = useState('');
  const [yearMin, setYearMin] = useState('');
  const [yearMax, setYearMax] = useState('');
  const [transmission, setTransmission] = useState('');
  const [fuel, setFuel] = useState('');
  const [status, setStatus] = useState('');

  // Динамические списки опций для фильтрации на основе текущих данных каталога
  const availableBrands = useMemo(() => {
    const brandsSet = new Set(cars.map(car => car.brand));
    return Array.from(brandsSet).filter(Boolean).sort();
  }, [cars]);

  const availableModels = useMemo(() => {
    const filtered = selectedBrand 
      ? cars.filter(car => car.brand.toLowerCase() === selectedBrand.toLowerCase())
      : cars;
    const modelsSet = new Set(filtered.map(car => car.model));
    return Array.from(modelsSet).filter(Boolean).sort();
  }, [cars, selectedBrand]);

  const availableFuels = useMemo(() => {
    const fuelsSet = new Set(cars.map(car => car.fuel));
    return Array.from(fuelsSet).filter(Boolean).sort();
  }, [cars]);

  // Модальные окна и интерактивность
  const [selectedCar, setSelectedCar] = useState(null);
  const [showAdminLoginModal, setShowAdminLoginModal] = useState(false);
  const [showAddEditModal, setShowAddEditModal] = useState(false);
  const [carToEdit, setCarToEdit] = useState(null);
  const [deleteConfirmCar, setDeleteConfirmCar] = useState(null);

  // Сессия администратора
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminPassword, setAdminPassword] = useState('');
  const [activeAdminTab, setActiveAdminTab] = useState('vehicles'); // 'vehicles' | 'inquiries'

  // Маршрутизация и детальный вид машины (SPA)
  const [currentView, setCurrentView] = useState('home'); // 'home' | 'catalog' | 'car-details'
  const [previousView, setPreviousView] = useState('home');
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [activeDetailsTab, setActiveDetailsTab] = useState('specs'); // 'specs' | 'finance' | 'paperwork' | 'testdrive'
  const [activeImage, setActiveImage] = useState('');
  
  // Полноэкранный просмотр фотографий (лайтбокс)
  const [showLightbox, setShowLightbox] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  // Локализация и языковые настройки (по умолчанию французский, считывается из localStorage)
  const [lang, setLang] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('lang');
      return saved || 'fr';
    }
    return 'fr';
  });

  useEffect(() => {
    localStorage.setItem('lang', lang);
  }, [lang]);

  const [translationEditLang, setTranslationEditLang] = useState('fr'); // 'fr' | 'ru' for editing
  const [translationActiveTab, setTranslationActiveTab] = useState('general'); // 'general' | 'catalog' | 'vehicle' | 'forms'

  const translations = {
    fr: {
      catalog: "Catalogue",
      about: "À Propos",
      contact: "Contact",
      adminPanel: "Panneau d'administration",
      nousContacter: "Nous Contacter",
      vinVerified: "VIN vérifié",
      available: "Disponible",
      incoming: "En arrivage",
      sold: "Vendu",
      details: "Détails du véhicule",
      specifications: "Spécifications",
      financing: "Financement",
      procedures: "Démarches",
      testDrive: "Essai",
      techSpecs: "Caractéristiques techniques",
      modelYear: "Année modèle",
      mileage: "Kilométrage",
      fuel: "Carburant",
      transmission: "Transmission",
      enginePower: "Puissance moteur",
      co2Emissions: "Puissance fiscale (P6)",
      vinCertified: "Numéro VIN certifié",
      backToCatalog: "Retour au catalogue",
      backToHome: "Retour à l'accueil",
      brand: "Marque",
      model: "Modèle",
      year: "Année",
      price: "Prix",
      allTransmissions: "Toutes les transmissions",
      allStatuses: "Tous les statuts",
      clearFilters: "Effacer les filtres",
      filterBrandModel: "Marque, modèle...",
      filterPriceMax: "Prix max",
      whatsapp: "WhatsApp",
      callUs: "Nous appeler",
      copySuccess: "Copié !",
      copiedToClipboard: "Copié dans le presse-papiers !",
      simulatedLoa: "Mensualité LOA estimée",
      apport: "Apport personnel",
      duration: "Durée de location",
      months: "mois",
      monthlyPayment: "Mensualité",
      applyCG: "Faire ma demande de Carte Grise",
      clientInfo: "Informations du titulaire",
      fullName: "Nom complet",
      email: "Adresse e-mail",
      phone: "Numéro de téléphone",
      address: "Adresse postale",
      tradeInQuestion: "Avez-vous un véhicule à faire reprendre ?",
      tradeInInfo: "Détails du véhicule à reprendre",
      tradeInBrandModel: "Marque & Modèle",
      tradeInYear: "Année",
      tradeInKm: "Kilométrage",
      tradeInCondition: "État général",
      bookTestDrive: "Planifier mon essai routier",
      selectDateTime: "Sélectionnez la date et l'heure",
      preferredDate: "Date souhaitée",
      preferredTime: "Heure souhaitée",
      specialRequest: "Demande particulière",
      sendRequest: "Envoyer ma demande",
      formSuccess: "Votre demande a été enregistrée avec succès !",
      formError: "Une erreur est survenue, veuillez réessayer.",
      adminTitle: "Administration",
      logout: "Se déconnecter",
      addCar: "Ajouter un véhicule",
      editCar: "Modifier le véhicule",
      carSaved: "Véhicule enregistré !",
      carDeleted: "Véhicule supprimé !",
      deleteConfirm: "Êtes-vous sûr de vouloir supprimer ce véhicule ?",
      cancel: "Annuler",
      save: "Enregistrer",
      companyName: "Nom de l'entreprise",
      settingsSaved: "Paramètres mis à jour !",
      inquiries: "Demandes clients",
      Essence: "Essence",
      Diesel: "Diesel",
      Hybride: "Hybride",
      Automatique: "Automatique",
      Manuelle: "Manuelle",
      Mécanique: "Manuelle",
      "En stock": "Disponible",
      "En arrivage": "Réservé",
      Vendu: "Vendu",
      hp: "ch",
      copy: "Copier",
      settingsSavedOffline: "Paramètres enregistrés (mode hors ligne).",
      discoverCatalog: "Découvrir le catalogue",
      bookAppointment: "Prendre rendez-vous",
      ourSelection: "Notre sélection",
      featuredVehicles: "Véhicules à la Une",
      featuredDescription: "Tous les véhicules sont rigoureusement inspectés et prêts pour la livraison.",
      vehicleCatalogue: "Catalogue des Véhicules",
      vehicleCatalogueDesc: "Explorez notre catalogue de véhicules d'occasion et neufs.",
      all: "Toutes",
      priceMin: "Prix min (€)",
      priceMax: "Prix max (€)",
      minYear: "Année min",
      maxYear: "Année max",
      allTypes: "Tous",
      availability: "Disponibilité",
      searchText: "Recherche textuelle",
      searchPlaceholder: "Ex: GT3, Weissach...",
      noVehicles: "Aucun véhicule ne correspond à vos critères de recherche.",
      contactUs: "Contactez-nous",
      discussProject: "Discutons de votre projet",
      contactDesc: "Vous souhaitez avoir plus d'informations sur un modèle en particulier ? Contactez-nous directement.",
      messageSent: "Message envoyé avec succès !",
      specialRequestPlaceholder: "Je souhaite obtenir des informations complémentaires...",
      noDescription: "Aucune description de présentation n'a été spécifiée.",
      lightMode: "Mode Clair",
      darkMode: "Mode Sombre",
      minPlaceholder: "Min",
      maxPlaceholder: "Max",
      browseEntireCatalog: "Découvrir tout le catalogue ({count} véhicules)",
      updatingCatalogue: "Mise à jour du catalogue...",
      tabGeneralButtons: "Général & Boutons",
      tabCatalogFilters: "Catalogue & Filtres",
      tabTechnicalSpecs: "Fiche Technique",
      tabFormsLeasing: "Formulaires & LOA",
      fillAllFields: "Veuillez remplir tous les champs obligatoires.",
      allRightsReserved: "Tous droits réservés",
      stat1Title: "INSPECTION / SÉLECTION RIGOUREUSE",
      stat1Sub: "Confiance / État du véhicule",
      stat2Title: "VIN / NUMÉRO VÉRIFIÉ",
      stat2Sub: "Transparence / Historique",
      stat3Title: "LOG / LOGISTIQUE SÉCURISÉE ou CMD / SUR MESURE",
      stat3Sub: "Service / Logistique",
      prevImage: "Précédent (Gauche)",
      nextImage: "Suivant (Droite)",
      confirmDeletion: "Confirmer la suppression",
      navHelp: "Utilisez les touches ◄ et ► pour naviguer, Echap pour fermer",
      namePlaceholder: "Jean Dupont",
      emailPlaceholder: "jean@email.com",
      phonePlaceholder: "+33 6...",
      passwordPlaceholder: "Mot de passe",
      generalInfoStep: "Informations générales",
      mileageKm: "Kilométrage (km)",
      priceEuro: "Prix (€)",
      powerHp: "Puissance (ch)",
      techSpecsStep: "Caractéristiques Techniques",
      status: "Statut",
      co2gkm: "Puissance fiscale (P6)",
      certifyVin: "Certifier le VIN",
      mediaGalleryStep: "Galerie Média",
      mainImage: "Image Principale",
      photoGalleryLimit: "Galerie Photo (Max 30)",
      dragOr: "Glissez ou",
      browse: "parcourez",
    },
    en: {
      catalog: "Catalogue",
      about: "About Us",
      contact: "Contact",
      adminPanel: "Admin Panel",
      nousContacter: "Contact Us",
      vinVerified: "VIN verified",
      available: "In stock",
      incoming: "In transit",
      sold: "Sold",
      details: "Details",
      specifications: "Specifications",
      financing: "Financing",
      procedures: "Procedures",
      testDrive: "Test Drive",
      techSpecs: "Technical Specs",
      modelYear: "Model Year",
      mileage: "Mileage",
      fuel: "Fuel",
      transmission: "Transmission",
      enginePower: "Engine Power",
      co2Emissions: "Fiscal power (P6)",
      vinCertified: "Certified VIN",
      backToCatalog: "Back to catalogue",
      backToHome: "Back to home",
      brand: "Brand",
      model: "Model",
      year: "Year",
      price: "Price",
      allTransmissions: "All Transmissions",
      allStatuses: "All Statuses",
      clearFilters: "Clear Filters",
      filterBrandModel: "Brand, model...",
      filterPriceMax: "Max Price",
      whatsapp: "WhatsApp",
      callUs: "Call Us",
      copySuccess: "Copied!",
      copiedToClipboard: "Copied to clipboard!",
      simulatedLoa: "Estimated Monthly Payment",
      apport: "Down Payment",
      duration: "Leasing Duration",
      months: "months",
      monthlyPayment: "Monthly Payment",
      applyCG: "Apply for Registration (Carte Grise)",
      clientInfo: "Owner Information",
      fullName: "Full Name",
      email: "Email Address",
      phone: "Phone Number",
      address: "Postal Address",
      tradeInQuestion: "Do you have a vehicle to trade in?",
      tradeInInfo: "Trade-in Vehicle Details",
      tradeInBrandModel: "Brand & Model",
      tradeInYear: "Year",
      tradeInKm: "Mileage",
      tradeInCondition: "General Condition",
      bookTestDrive: "Schedule a Test Drive",
      selectDateTime: "Select Date & Time",
      preferredDate: "Preferred Date",
      preferredTime: "Preferred Time",
      specialRequest: "Special Requests",
      sendRequest: "Send Request",
      formSuccess: "Your request has been successfully submitted!",
      formError: "An error occurred, please try again.",
      adminTitle: "Admin Panel",
      logout: "Log Out",
      addCar: "Add Vehicle",
      editCar: "Edit Vehicle",
      carSaved: "Vehicle saved!",
      carDeleted: "Vehicle deleted!",
      deleteConfirm: "Are you sure you want to delete this vehicle?",
      cancel: "Cancel",
      save: "Save",
      companyName: "Company Name",
      settingsSaved: "Settings saved successfully!",
      inquiries: "Client Inquiries",
      Essence: "Petrol",
      Diesel: "Diesel",
      Hybride: "Hybrid",
      Automatique: "Automatic",
      Manuelle: "Manual",
      Mécanique: "Manual",
      "En stock": "In stock",
      "En arrivage": "Reserved",
      Vendu: "Sold",
      hp: "hp",
      copy: "Copy",
      settingsSavedOffline: "Settings saved locally (offline mode).",
      discoverCatalog: "Browse catalogue",
      bookAppointment: "Book an appointment",
      ourSelection: "Our Selection",
      featuredVehicles: "Featured Vehicles",
      featuredDescription: "All vehicles are rigorously inspected and ready for delivery.",
      vehicleCatalogue: "Vehicle Catalogue",
      vehicleCatalogueDesc: "Explore our catalogue of new and pre-owned vehicles.",
      all: "All",
      priceMin: "Min Price (€)",
      priceMax: "Max Price (€)",
      minYear: "Min Year",
      maxYear: "Max Year",
      allTypes: "All",
      availability: "Availability",
      searchText: "Search keywords",
      searchPlaceholder: "Ex: GT3, Weissach...",
      noVehicles: "No vehicles match your search criteria.",
      contactUs: "Contact Us",
      discussProject: "Let's discuss your project",
      contactDesc: "Want more information about a specific model or to schedule a visit? Contact us directly.",
      messageSent: "Message sent successfully! We will contact you.",
      specialRequestPlaceholder: "I would like to get more information about...",
      noDescription: "No description available.",
      lightMode: "Light Mode",
      darkMode: "Dark Mode",
      minPlaceholder: "Min",
      maxPlaceholder: "Max",
      browseEntireCatalog: "Browse entire catalogue ({count} cars)",
      updatingCatalogue: "Updating catalogue...",
      tabGeneralButtons: "General & Buttons",
      tabCatalogFilters: "Catalogue & Filters",
      tabTechnicalSpecs: "Technical Specifications",
      tabFormsLeasing: "Forms & Leasing",
      fillAllFields: "Please fill in all required fields.",
      allRightsReserved: "All rights reserved",
      stat1Title: "RIGOROUS INSPECTION / SELECTION",
      stat1Sub: "Trust / Vehicle Condition",
      stat2Title: "VIN / VERIFIED NUMBER",
      stat2Sub: "Transparency / History",
      stat3Title: "SECURE LOGISTICS / CUSTOM ORDER",
      stat3Sub: "Service / Logistics",
      prevImage: "Previous (Left)",
      nextImage: "Next (Right)",
      confirmDeletion: "Confirm Deletion",
      navHelp: "Use ◄ and ► to navigate, Esc to close",
      namePlaceholder: "John Doe",
      emailPlaceholder: "john@email.com",
      phonePlaceholder: "+1 234...",
      passwordPlaceholder: "Password",
      generalInfoStep: "General Info",
      mileageKm: "Mileage (km)",
      priceEuro: "Price (€)",
      powerHp: "Power (hp)",
      techSpecsStep: "Tech Specs",
      status: "Status",
      co2gkm: "Fiscal power (P6)",
      certifyVin: "Certify VIN",
      mediaGalleryStep: "Media Gallery",
      mainImage: "Main Image",
      photoGalleryLimit: "Photo Gallery (Max 30)",
      dragOr: "Drag or",
      browse: "browse",
    },
    ru: {
      catalog: "Каталог",
      about: "О нас",
      contact: "Контакты",
      adminPanel: "Панель администратора",
      nousContacter: "Связаться с нами",
      vinVerified: "VIN проверен",
      available: "В наличии",
      incoming: "В пути",
      sold: "Продано",
      details: "Подробнее",
      specifications: "Характеристики",
      financing: "Кредит / Лизинг",
      procedures: "Оформление документов",
      testDrive: "Тест-драйв",
      techSpecs: "Технические характеристики",
      modelYear: "Год выпуска",
      mileage: "Пробег",
      fuel: "Тип топлива",
      transmission: "Коробка передач",
      enginePower: "Мощность двигателя",
      co2Emissions: "Налоговая мощность (P6)",
      vinCertified: "Сертифицированный VIN",
      backToCatalog: "Назад в каталог",
      backToHome: "Назад на главную",
      brand: "Марка",
      model: "Модель",
      year: "Год",
      price: "Цена",
      allTransmissions: "Все коробки передач",
      allStatuses: "Все статусы",
      clearFilters: "Сбросить фильтры",
      filterBrandModel: "Марка, модель...",
      filterPriceMax: "Макс. цена",
      whatsapp: "WhatsApp",
      callUs: "Позвонить нам",
      copySuccess: "Скопировано!",
      copiedToClipboard: "Скопировано в буфер обмена!",
      simulatedLoa: "Оценочный лизинг",
      apport: "Первоначальный взнос",
      duration: "Срок лизинга",
      months: "мес",
      monthlyPayment: "Ежемесячный платеж",
      applyCG: "Подать заявку на Carte Grise",
      clientInfo: "Информация о владельце",
      fullName: "ФИО владельца",
      email: "Адрес эл. почты",
      phone: "Номер телефона",
      address: "Почтовый адрес",
      tradeInQuestion: "Хотите сдать старый автомобиль в трейд-ин?",
      tradeInInfo: "Детали старого автомобиля",
      tradeInBrandModel: "Марка и Модель",
      tradeInYear: "Год выпуска",
      tradeInKm: "Пробег",
      tradeInCondition: "Общее состояние",
      bookTestDrive: "Записаться на тест-драйв",
      selectDateTime: "Выберите дату и время",
      preferredDate: "Желаемая дата",
      preferredTime: "Желаемое время",
      specialRequest: "Особые пожелания",
      sendRequest: "Отправить запрос",
      formSuccess: "Ваш запрос успешно отправлен!",
      formError: "Произошла ошибка, попробуйте еще раз.",
      adminTitle: "Панель администратора",
      logout: "Выйти",
      addCar: "Добавить автомобиль",
      editCar: "Редактировать автомобиль",
      carSaved: "Автомобиль сохранен!",
      carDeleted: "Автомобиль удален!",
      deleteConfirm: "Вы уверены, что хотите удалить этот автомобиль?",
      cancel: "Отмена",
      save: "Сохранить",
      companyName: "Название компании",
      settingsSaved: "Настройки успешно сохранены!",
      inquiries: "Запросы клиентов",
      Essence: "Бензин",
      Diesel: "Дизель",
      Hybride: "Гибрид",
      Automatique: "Автомат",
      Manuelle: "Механика",
      Mécanique: "Механика",
      "En stock": "В наличии",
      "En arrivage": "Зарезервировано",
      Vendu: "Продано",
      hp: "л.с.",
      copy: "Копировать",
      settingsSavedOffline: "Настройки сохранены локально.",
      discoverCatalog: "Открыть каталог",
      bookAppointment: "Записаться на встречу",
      ourSelection: "Наш выбор",
      featuredVehicles: "Рекомендуемые модели",
      featuredDescription: "Автомобили прошли полную предпродажную подготовку и технический контроль.",
      vehicleCatalogue: "Каталог автомобилей",
      vehicleCatalogueDesc: "Ознакомьтесь с нашим каталогом б/у и новых автомобилей.",
      all: "Все",
      priceMin: "Цена от (€)",
      priceMax: "Цена до (€)",
      minYear: "Год выпуска от",
      maxYear: "Год выпуска до",
      allTypes: "Все типы",
      availability: "Статус",
      searchText: "Поиск по ключевым словам",
      searchPlaceholder: "Например: GT3, Weissach...",
      noVehicles: "Ни один автомобиль не соответствует вашим критериям поиска.",
      contactUs: "Связаться с нами",
      discussProject: "Обсудим ваш проект",
      contactDesc: "Хотите узнать больше о конкретной модели или запланировать визит? Свяжитесь с нами напрямую.",
      messageSent: "Сообщение успешно отправлено! Мы свяжемся с вами.",
      specialRequestPlaceholder: "Я хотел бы получить дополнительную информацию о Porsche 911 GT3...",
      noDescription: "Описание отсутствует.",
      lightMode: "Светлая тема",
      darkMode: "Тёмная тема",
      minPlaceholder: "от 0",
      maxPlaceholder: "до любой",
      browseEntireCatalog: "Открыть весь каталог ({count} авто)",
      updatingCatalogue: "Обновление каталога...",
      tabGeneralButtons: "Общие / Кнопки",
      tabCatalogFilters: "Каталог / Фильтры",
      tabTechnicalSpecs: "Характеристики",
      tabFormsLeasing: "Формы / Лизинг",
      fillAllFields: "Пожалуйста, заполните все обязательные поля.",
      allRightsReserved: "Все права защищены",
      stat1Title: "СТРОГИЙ ОСМОТР / ОТБОР",
      stat1Sub: "Надежность / Состояние авто",
      stat2Title: "VIN / ПРОВЕРЕННЫЙ НОМЕР",
      stat2Sub: "Прозрачность / История",
      stat3Title: "БЕЗОПАСНАЯ ЛОГИСТИКА / ПОД ЗАКАЗ",
      stat3Sub: "Сервис / Логистика",
      prevImage: "Назад (Влево)",
      nextImage: "Вперед (Вправо)",
      confirmDeletion: "Подтвердить удаление",
      navHelp: "Используйте ◄ и ► для навигации, Esc для закрытия",
      namePlaceholder: "Иван Иванов",
      emailPlaceholder: "ivan@email.com",
      phonePlaceholder: "+7 900...",
      passwordPlaceholder: "Пароль",
      generalInfoStep: "Основная информация",
      mileageKm: "Пробег (км)",
      priceEuro: "Цена (€)",
      powerHp: "Мощность (л.с.)",
      techSpecsStep: "Технические характеристики",
      status: "Статус",
      co2gkm: "Налоговая мощность (P6)",
      certifyVin: "Подтвердить VIN",
      mediaGalleryStep: "Медиагалерея",
      mainImage: "Главное фото",
      photoGalleryLimit: "Галерея фото (Макс 30)",
      dragOr: "Перетащите или",
      browse: "выберите файл",
    }
  };

  const t = (key: string) => {
    if (siteSettings?.translations?.[lang]?.[key]) {
      return siteSettings.translations[lang][key];
    }
    return translations[lang][key] || key;
  };


  const DEFAULT_SETTINGS = {
    companyName: "Ligo Automobiles",
    address: "Paris, France",
    phone: "+33 7 66 75 32 23",
    email: "ligo.automobiles@gmail.com",
    bannerImage: "",
    aboutImage: "",
    stat1Number: "✓",
    stat2Number: "VIN",
    stat3Number: "DOC",
    ru: {
      bannerTitle: "Покупка и продажа автомобилей",
      bannerSubtitle: "Ligo Automobiles • Франция",
      bannerDescription: "Профессиональный подбор, проверка истории и техническая инспекция каждого автомобиля. Сопровождение сделки \"под ключ\".",
      aboutSubtitle: "Ligo Automobiles",
      aboutTitle: "Ваш надёжный партнёр по подбору автомобилей во Франции",
      aboutText: "Мы обеспечиваем полную прозрачность на всех этапах сделки. Каждый автомобиль проходит комплексную техническую проверку и юридическую экспертизу.",
      featuredCategory: "Каталог",
      featuredTitle: "Наши автомобили",
      featuredSubtitle: "Проверенные технически и готовые к эксплуатации модели.",
      stat1Title: "СТРОГИЙ ОСМОТР / ОТБОР",
      stat1Sub: "Надежность / Состояние авто",
      stat2Title: "VIN / ПРОВЕРЕННЫЙ НОМЕР",
      stat2Sub: "Прозрачность / История",
      stat3Title: "БЕЗОПАСНАЯ ЛОГИСТИКА / ПОД ЗАКАЗ",
      stat3Sub: "Сервис / Логистика",
      contactTitle: "Связаться с нами",
      contactSubtitle: "Обсудим ваш проект",
      contactDescription: "Хотите получить дополнительную информацию о конкретной модели? Свяжитесь с нами напрямую."
    },
    fr: {
      bannerTitle: "Achat et Vente d'Automobiles",
      bannerSubtitle: "Ligo Automobiles • France",
      bannerDescription: "Sélection rigoureuse, historique transparent et accompagnement administratif complet.",
      aboutSubtitle: "Ligo Automobiles",
      aboutTitle: "Votre partenaire de confiance en France",
      aboutText: "Nous assurons une transparence totale à chaque étape de la transaction. Chaque véhicule subit une inspection technique et juridique complète.",
      featuredCategory: "Catalogue",
      featuredTitle: "Nos Véhicules",
      featuredSubtitle: "Des modèles techniquement éprouvés et prêts à l'emploi.",
      stat1Title: "INSPECTION / SÉLECTION RIGOUREUSE",
      stat1Sub: "Confiance / État du véhicule",
      stat2Title: "VIN / NUMÉRO VÉRIFIÉ",
      stat2Sub: "Transparence / Historique",
      stat3Title: "LOG / LOGISTIQUE SÉCURISÉE ou CMD / SUR MESURE",
      stat3Sub: "Service / Logistique",
      contactTitle: "Contactez-nous",
      contactSubtitle: "Discutons de votre projet",
      contactDescription: "Vous souhaitez plus d'informations sur un modèle précis ? Contactez-nous directement."
    },
    en: {
      bannerTitle: "Purchase & Sale of Cars",
      bannerSubtitle: "Ligo Automobiles • France",
      bannerDescription: "Professional selection, history check, and technical inspection of each vehicle. Turnkey deal support.",
      aboutSubtitle: "Ligo Automobiles",
      aboutTitle: "Your Trusted Car Sourcing Partner in France",
      aboutText: "We ensure complete transparency at every stage of the deal. Every car undergoes a comprehensive technical check and legal inspection.",
      featuredCategory: "Catalogue",
      featuredTitle: "Our Vehicles",
      featuredSubtitle: "Technically proven and ready-to-run models.",
      stat1Title: "RIGOROUS INSPECTION / SELECTION",
      stat1Sub: "Trust / Vehicle Condition",
      stat2Title: "VIN / VERIFIED NUMBER",
      stat2Sub: "Transparency / History",
      stat3Title: "SECURE LOGISTICS / CUSTOM ORDER",
      stat3Sub: "Service / Logistics",
      contactTitle: "Contact Us",
      contactSubtitle: "Discuss your project",
      contactDescription: "Want to get more information about a specific model? Contact us directly."
    }
  };

  const [siteSettings, setSiteSettings] = useState(DEFAULT_SETTINGS);
  const [adminLang, setAdminLang] = useState<'ru'|'fr'>('ru');

  // Состояние кредитного симулятора
  const [loanApport, setLoanApport] = useState(10000);
  const [loanDuration, setLoanDuration] = useState(36);

  // Форма добавления/редактирования авто
  const [formData, setFormData] = useState({
    brand: '', model: '', year: new Date().getFullYear(), km: '', price: '', fuel: 'Essence',
    transmission: 'Automatique', hp: '', co2: '', vin: '', status: 'En stock', image: '',
    description: '', description_en: '', description_ru: '', verifiedVin: false, galleryImages: []
  });
  const [formErrors, setFormErrors] = useState({ brand: false, model: false, price: false, image: false });

  const [cgForm, setCgForm] = useState({ name: '', email: '', phone: '', address: '', hasTradeIn: false, tradeInBrandModel: '', tradeInYear: '', tradeInKm: '', tradeInCondition: '' });
  const [testDriveForm, setTestDriveForm] = useState({ name: '', email: '', phone: '', date: '', time: '', comment: '' });
  const [inquiries, setInquiries] = useState([]);

  const [galleryUploadQueue, setGalleryUploadQueue] = useState([]);
  const [galleryUploading, setGalleryUploading] = useState(false);
  const [currentCarGallery, setCurrentCarGallery] = useState([]);
  const [mainImageUploading, setMainImageUploading] = useState(false);
  const [mainImageProgress, setMainImageProgress] = useState(0);
  const [isDraggingMain, setIsDraggingMain] = useState(false);
  const [isDraggingGallery, setIsDraggingGallery] = useState(false);

  const uploadToImgBB = async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append('image', file);
    const response = await fetch('https://api.imgbb.com/1/upload?key=25812d2bb5a355308a29abb882264648', {
      method: 'POST',
      body: formData
    });
    if (!response.ok) {
      throw new Error('ImgBB Upload Failed');
    }
    const data = await response.json();
    return data.data.url;
  };

  const handleMainImageUpload = async (file) => {
    try {
      setMainImageUploading(true);
      setMainImageProgress(50);
      const imageUrl = await uploadToImgBB(file);
      setFormData(prev => ({ ...prev, image: imageUrl }));
      setMainImageProgress(100);
      setTimeout(() => setMainImageUploading(false), 500);
    } catch (err) {
      console.error("Main image upload error:", err);
      setMainImageUploading(false);
    }
  };

  const handleGalleryImagesUpload = async (files) => {
    setGalleryUploading(true);
    const queue = files.map((f, i) => ({ id: `upload-${Date.now()}-${i}`, name: f.name, progress: 50, status: 'uploading', file: f }));
    setGalleryUploadQueue(queue);
    
    for (const item of queue) {
      try {
        const imageUrl = await uploadToImgBB(item.file);
        setGalleryUploadQueue(prev => prev.map(q => q.id === item.id ? { ...q, progress: 100, status: 'done' } : q));
        setFormData(prev => ({ ...prev, galleryImages: [...(prev.galleryImages || []), imageUrl] }));
      } catch (err) {
        setGalleryUploadQueue(prev => prev.map(q => q.id === item.id ? { ...q, status: 'error' } : q));
      }
    }
    setTimeout(() => {
      setGalleryUploadQueue([]);
      setGalleryUploading(false);
    }, 1500);
  };

  useEffect(() => {
    const initAuth = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          await signInAnonymously(auth);
        }
      } catch (err) {
        console.error("Auth Exception Error: ", err);
      }
    };
    initAuth();
    const unsubscribe = onAuthStateChanged(auth, (usr) => { setUser(usr); });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!showLightbox || currentCarGallery.length === 0) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShowLightbox(false);
      else if (e.key === 'ArrowRight') setLightboxIndex(prev => (prev === currentCarGallery.length - 1 ? 0 : prev + 1));
      else if (e.key === 'ArrowLeft') setLightboxIndex(prev => (prev === 0 ? currentCarGallery.length - 1 : prev - 1));
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showLightbox, currentCarGallery]);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    let isResolved = false;
    const loadTimeout = setTimeout(() => {
      if (!isResolved) {
        setCars(DEMO_CARS);
        setLoading(false);
      }
    }, 4000);
    const carsCollectionRef = collection(db, 'artifacts', appId, 'public', 'data', 'cars');
    const q = query(carsCollectionRef);
    const unsubscribe = onSnapshot(q, (snapshot) => {
      isResolved = true;
      clearTimeout(loadTimeout);
      if (snapshot.empty) { setCars(DEMO_CARS); } else {
        const list = [];
        snapshot.forEach((docSnap) => { list.push({ id: docSnap.id, ...docSnap.data() }); });
        setCars(list);
      }
      setLoading(false);
    }, (err) => {
      isResolved = true;
      clearTimeout(loadTimeout);
      setCars(DEMO_CARS);
      setLoading(false);
    });
    return () => { clearTimeout(loadTimeout); unsubscribe(); };
  }, [user, appId]);

  const showNotification = (msg, type = "info") => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 4500);
  };

  const handleCopyVIN = (vinText) => {
    const tempInput = document.createElement("input");
    tempInput.value = vinText;
    document.body.appendChild(tempInput);
    tempInput.select();
    document.execCommand("copy");
    document.body.removeChild(tempInput);
    showNotification(t('copiedToClipboard'), "success");
  };

  const seedDemoData = async () => {
    try {
      const carsCollection = collection(db, 'artifacts', appId, 'public', 'data', 'cars');
      for (const car of DEMO_CARS) {
        const { id, ...carData } = car;
        await withTimeout(addDoc(carsCollection, carData), 2000);
      }
      showNotification("Catalogue de démonstration initialisé avec succès !", "info");
    } catch (err) { console.error("Error seeding catalog:", err); }
  };

  const filteredCars = useMemo(() => {
    return cars.filter(car => {
      if (selectedBrand && car.brand.toLowerCase() !== selectedBrand.toLowerCase()) return false;
      if (selectedModel && car.model.toLowerCase() !== selectedModel.toLowerCase()) return false;
      if (priceMin && car.price < Number(priceMin)) return false;
      if (priceMax && car.price > Number(priceMax)) return false;
      if (yearMin && car.year < Number(yearMin)) return false;
      if (yearMax && car.year > Number(yearMax)) return false;
      if (transmission && car.transmission !== transmission) return false;
      if (fuel && car.fuel !== fuel) return false;
      if (status && car.status !== status) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const searchStr = `${car.brand} ${car.model} ${car.description || ''} ${car.vin || ''} ${car.year}`.toLowerCase();
        if (!searchStr.includes(q)) return false;
      }
      return true;
    });
  }, [cars, selectedBrand, selectedModel, priceMin, priceMax, yearMin, yearMax, transmission, fuel, status, searchQuery]);

  const handleSelectCar = (car) => {
    setSelectedCar(car);
    setPreviousView(currentView);
    setCurrentView('car-details');
    setActiveDetailsTab('specs');
    setActiveImage(car.image || '');
    setCurrentCarGallery([car.image, ...(car.galleryImages || [])].filter(Boolean));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleOpenAddModal = () => {
    setCarToEdit(null);
    setFormData({ brand: '', model: '', year: new Date().getFullYear(), km: '', price: '', fuel: 'Essence', transmission: 'Automatique', hp: '', co2: '', vin: '', status: 'En stock', image: '', description: '', description_en: '', description_ru: '', verifiedVin: false, galleryImages: [] });
    setFormErrors({ brand: false, model: false, price: false, image: false });
    setShowAddEditModal(true);
  };

  const handleOpenEditModal = (car) => {
    setCarToEdit(car);
    setFormData({ brand: car.brand || '', model: car.model || '', year: car.year || new Date().getFullYear(), km: car.km || '', price: car.price || '', fuel: car.fuel || 'Essence', transmission: car.transmission || 'Automatique', hp: car.hp || '', co2: car.co2 || '', vin: car.vin || '', status: car.status || 'En stock', image: car.image || '', description: car.description || '', description_en: car.description_en || '', description_ru: car.description_ru || '', verifiedVin: car.verifiedVin || false, galleryImages: car.galleryImages || [] });
    setFormErrors({ brand: false, model: false, price: false, image: false });
    setShowAddEditModal(true);
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    const errors = { brand: !formData.brand.trim(), model: !formData.model.trim(), price: !formData.price || Number(formData.price) <= 0, image: !formData.image };
    setFormErrors(errors);
    if (Object.values(errors).some(Boolean)) { showNotification(t('fillAllFields'), "error"); return; }
    const carData = { brand: formData.brand.trim(), model: formData.model.trim(), year: Number(formData.year) || new Date().getFullYear(), km: Number(formData.km) || 0, price: Number(formData.price), fuel: formData.fuel, transmission: formData.transmission, hp: Number(formData.hp) || 0, co2: Number(formData.co2) || 0, vin: formData.vin.trim(), status: formData.status, image: formData.image, description: formData.description.trim(), verifiedVin: formData.verifiedVin, galleryImages: formData.galleryImages || [] };
    try {
      if (carToEdit) {
        const carDocRef = doc(db, 'artifacts', appId, 'public', 'data', 'cars', carToEdit.id);
        await withTimeout(updateDoc(carDocRef, carData), 3000);
      } else {
        const carsCollection = collection(db, 'artifacts', appId, 'public', 'data', 'cars');
        await withTimeout(addDoc(carsCollection, carData), 3000);
      }
      showNotification(t('carSaved'), "success");
    } catch (err) {
      if (carToEdit) { setCars(prev => prev.map(c => c.id === carToEdit.id ? { ...c, ...carData } : c)); }
      else { setCars(prev => [...prev, { id: `local-${Date.now()}`, ...carData }]); }
      showNotification(t('carSaved') + " (mode hors ligne)", "success");
    }
    setShowAddEditModal(false);
  };

  const handleDeleteCar = async () => {
    if (!deleteConfirmCar) return;
    try {
      const carDocRef = doc(db, 'artifacts', appId, 'public', 'data', 'cars', deleteConfirmCar.id);
      await withTimeout(deleteDoc(carDocRef), 2000);
      showNotification(t('carDeleted'), "success");
    } catch (err) {
      setCars(prev => prev.filter(car => car.id !== deleteConfirmCar.id));
      showNotification(t('carDeleted') + " (mode hors ligne)", "success");
    }
    setDeleteConfirmCar(null);
    if (selectedCar && selectedCar.id === deleteConfirmCar.id) setSelectedCar(null);
  };

  const handleAdminLoginSubmit = (e) => {
    e.preventDefault();
    if (adminPassword === 'admin2024') {
      setIsAdmin(true);
      setShowAdminLoginModal(false);
      setAdminPassword('');
      setCurrentView('admin');
      showNotification("Connexion réussie.", "success");
    } else { showNotification("Mot de passe incorrect.", "error"); }
  };

  const MOCK_INQUIRIES = [
    { id: "inq-1", type: "Carte Grise & Immatriculation", carBrand: "Porsche", carModel: "911 GT3 RS", carPrice: 289000, clientName: "Pierre Dubois", clientEmail: "pierre.dubois@example.fr", clientPhone: "+33612345678", clientAddress: "15 Rue de la Paix, 75002 Paris", hasTradeIn: true, tradeInDetails: "Porsche Cayman S (2016) - 65k km - Excellent état", status: "Nouveau", createdAt: new Date(Date.now() - 3600000 * 2).toISOString() },
    { id: "inq-2", type: "Demande d'essai / RDV", carBrand: "Ferrari", carModel: "F8 Tributo", carPrice: 315000, clientName: "Marc Vasseur", clientEmail: "marc.vasseur@example.fr", clientPhone: "+33687654321", clientAddress: "Showroom", hasTradeIn: false, tradeInDetails: "", status: "Traité", createdAt: new Date(Date.now() - 3600000 * 24).toISOString() }
  ];

  useEffect(() => {
    if (!isAdmin) return;
    const inquiriesCollectionRef = collection(db, 'artifacts', appId, 'public', 'data', 'inquiries');
    const q = query(inquiriesCollectionRef);
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list = [];
      snapshot.forEach((docSnap) => { list.push({ id: docSnap.id, ...docSnap.data() }); });
      list.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
      setInquiries(list.length > 0 ? list : MOCK_INQUIRIES);
    }, (err) => {
      console.warn('Firestore inquiries subscription error:', err);
      setInquiries(MOCK_INQUIRIES);
    });
    return () => unsubscribe();
  }, [isAdmin, appId]);

  useEffect(() => {
    const settingsDocRef = doc(db, 'artifacts', appId, 'public', 'data', 'settings', 'site');
    const unsubscribe = onSnapshot(settingsDocRef, (docSnap) => {
      if (docSnap.exists()) setSiteSettings(prev => ({ ...prev, ...docSnap.data() }));
    }, (err) => { console.warn('Firestore settings subscription error:', err); });
    return () => unsubscribe();
  }, [appId]);

  const handleCarteGriseSubmit = (e) => {
    e.preventDefault();
    if (!cgForm.name || !cgForm.email || !cgForm.phone || !cgForm.address) { showNotification(t('fillAllFields'), "error"); return; }
    const inquiryData = { type: "Carte Grise & Immatriculation", carBrand: selectedCar.brand, carModel: selectedCar.model, carPrice: selectedCar.price, clientName: cgForm.name, clientEmail: cgForm.email, clientPhone: cgForm.phone, clientAddress: cgForm.address, hasTradeIn: cgForm.hasTradeIn, tradeInDetails: cgForm.hasTradeIn ? `${cgForm.tradeInBrandModel} (${cgForm.tradeInYear}) - ${cgForm.tradeInKm} km - ${cgForm.tradeInCondition}` : "", status: "Nouveau", createdAt: new Date().toISOString() };
    try { const ref = collection(db, 'artifacts', appId, 'public', 'data', 'inquiries'); addDoc(ref, inquiryData); } catch (err) { console.warn("Offline:", err); }
    showNotification(t('formSuccess'), "success");
    setCgForm({ name: '', email: '', phone: '', address: '', hasTradeIn: false, tradeInBrandModel: '', tradeInYear: '', tradeInKm: '', tradeInCondition: '' });
  };

  const handleTestDriveSubmit = (e) => {
    e.preventDefault();
    if (!testDriveForm.name || !testDriveForm.email || !testDriveForm.phone || !testDriveForm.date) { showNotification(t('fillAllFields'), "error"); return; }
    const inquiryData = { type: "Demande d'essai / RDV", carBrand: selectedCar.brand, carModel: selectedCar.model, carPrice: selectedCar.price, clientName: testDriveForm.name, clientEmail: testDriveForm.email, clientPhone: testDriveForm.phone, clientAddress: "Showroom", preferredDate: testDriveForm.date, preferredTime: testDriveForm.time, specialRequest: testDriveForm.comment, hasTradeIn: false, tradeInDetails: "", status: "Nouveau", createdAt: new Date().toISOString() };
    try { const ref = collection(db, 'artifacts', appId, 'public', 'data', 'inquiries'); addDoc(ref, inquiryData); } catch (err) { console.warn("Offline:", err); }
    showNotification(t('formSuccess'), "success");
    setTestDriveForm({ name: '', email: '', phone: '', date: '', time: '', comment: '' });
  };

  const handleMarkAsProcessed = async (inquiryId) => {
    try { const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'inquiries', inquiryId); await withTimeout(updateDoc(docRef, { status: "Traité" }), 2000); showNotification("Demande marquée comme traitée.", "success"); }
    catch (err) { setInquiries(prev => prev.map(i => i.id === inquiryId ? { ...i, status: "Traité" } : i)); showNotification("Demande marquée comme traitée (hors ligne).", "success"); }
  };

  const handleDeleteInquiry = async (inquiryId) => {
    try { const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'inquiries', inquiryId); await withTimeout(deleteDoc(docRef), 2000); showNotification("Demande supprimée.", "success"); }
    catch (err) { setInquiries(prev => prev.filter(i => i.id !== inquiryId)); showNotification("Demande supprimée (hors ligne).", "success"); }
  };

  const handleSaveSettings = async () => {
    try { const settingsDocRef = doc(db, 'artifacts', appId, 'public', 'data', 'settings', 'site'); await withTimeout(setDoc(settingsDocRef, siteSettings, { merge: true }), 3000); showNotification(t('settingsSaved'), "success"); }
    catch (err) { showNotification(t('settingsSavedOffline'), "success"); }
  };

  const renderAdminDashboard = () => {
    return (
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex items-center justify-between mb-8 pb-4 border-b border-neutral-200 dark:border-neutral-900">
          <div>
            <h2 className="text-2xl font-serif text-neutral-900 dark:text-white">{t('adminTitle')}</h2>
            <p className="text-neutral-600 dark:text-neutral-400 text-xs mt-1">Panneau de gestion du catalogue et des demandes clients.</p>
          </div>
          <div className="flex gap-3">
            <button onClick={() => seedDemoData()} className="px-4 py-2 rounded-xl bg-neutral-100 dark:bg-[#0D0D0D] border border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-400 hover:border-[#D4AF37] hover:text-[#D4AF37] text-xs font-bold transition-all">Seed Demo</button>
            <button onClick={() => { setIsAdmin(false); setCurrentView('home'); }} className="px-4 py-2 rounded-xl bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-950/40 text-xs font-bold transition-all">{t('logout')}</button>
          </div>
        </div>

        <div className="flex gap-3 mb-8">
          <button onClick={() => setActiveAdminTab('vehicles')} className={`px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${activeAdminTab === 'vehicles' ? 'bg-[#D4AF37] text-neutral-950 shadow-lg' : 'bg-neutral-100 dark:bg-[#0D0D0D] border border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-400 hover:border-[#D4AF37]'}`}>{t('catalog')}</button>
          <button onClick={() => setActiveAdminTab('inquiries')} className={`px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${activeAdminTab === 'inquiries' ? 'bg-[#D4AF37] text-neutral-950 shadow-lg' : 'bg-neutral-100 dark:bg-[#0D0D0D] border border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-400 hover:border-[#D4AF37]'}`}>{t('inquiries')} ({inquiries.length})</button>
          <button onClick={() => setActiveAdminTab('settings')} className={`px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${activeAdminTab === 'settings' ? 'bg-[#D4AF37] text-neutral-950 shadow-lg' : 'bg-neutral-100 dark:bg-[#0D0D0D] border border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-400 hover:border-[#D4AF37]'}`}>CMS</button>
        </div>

        {activeAdminTab === 'vehicles' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-lg text-neutral-900 dark:text-white font-serif">{t('catalog')}</h3>
              <button onClick={handleOpenAddModal} className="flex items-center gap-2 px-6 py-3 rounded-xl bg-[#D4AF37] hover:bg-[#D4AF37]/90 text-neutral-950 font-bold text-xs uppercase tracking-wider transition-all shadow-lg"><Icons.Plus />{t('addCar')}</button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {cars.map(car => (
                <div key={car.id} className="bg-white dark:bg-[#121214] border border-neutral-200 dark:border-neutral-900 hover:border-[#D4AF37]/35 rounded-2xl overflow-hidden flex flex-col justify-between p-5 transition-all shadow-sm">
                  <div className="flex gap-4">
                    <img src={car.image || getFallbackSvg(400, 250, 16, 2)} alt={car.model} className="w-24 h-16 object-cover rounded-lg border border-neutral-200 dark:border-neutral-800" onError={(e) => { const fb = getFallbackSvg(400, 250, 16, 2); if (e.currentTarget.src !== fb) e.currentTarget.src = fb; }} />
                    <div className="space-y-1">
                      <span className="text-[10px] text-[#D4AF37] uppercase tracking-widest font-bold">{car.brand}</span>
                      <h4 className="text-sm font-bold text-neutral-900 dark:text-white truncate max-w-[150px]">{car.model}</h4>
                      <div className="text-xs text-[#D4AF37] font-semibold">{car.price ? car.price.toLocaleString('fr-FR') : '0'} €</div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between gap-4 mt-4 pt-3 border-t border-neutral-200 dark:border-neutral-900">
                    <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${car.status === 'Vendu' ? 'bg-neutral-100 dark:bg-neutral-950/20 text-neutral-500 dark:text-neutral-400 border border-neutral-200 dark:border-neutral-800' : car.status === 'En arrivage' ? 'bg-amber-50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-900/50' : 'bg-green-50 dark:bg-green-950/20 text-green-600 dark:text-green-400 border border-green-200 dark:border-green-900/50'}`}>{t(car.status)}</span>
                    <div className="flex gap-2">
                      <button onClick={() => handleOpenEditModal(car)} className="p-2 rounded-lg bg-neutral-100 dark:bg-[#0D0D0D] hover:bg-[#D4AF37]/10 text-neutral-600 dark:text-neutral-400 hover:text-[#D4AF37] border border-neutral-200 dark:border-neutral-800 transition-all" title={t('edit')}><Icons.Edit /></button>
                      <button onClick={() => setDeleteConfirmCar(car)} className="p-2 rounded-lg bg-neutral-100 dark:bg-[#0D0D0D] hover:bg-red-50 dark:hover:bg-red-950/20 text-neutral-600 dark:text-neutral-400 hover:text-red-600 dark:hover:text-red-400 border border-neutral-200 dark:border-neutral-800 transition-all" title={t('delete')}><Icons.Trash /></button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeAdminTab === 'inquiries' && (
          <div className="space-y-4">
            {inquiries.map(inq => (
              <div key={inq.id} className="bg-white dark:bg-[#121214] border border-neutral-200 dark:border-neutral-900 rounded-2xl p-6 shadow-sm">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-[10px] text-[#D4AF37] uppercase tracking-widest font-bold">{inq.type}</span>
                    <h4 className="text-sm font-bold text-neutral-900 dark:text-white mt-1">{inq.carBrand} {inq.carModel}</h4>
                    <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-1">{inq.clientName} • {inq.clientEmail} • {inq.clientPhone}</p>
                    {inq.hasTradeIn && <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">Reprise: {inq.tradeInDetails}</p>}
                  </div>
                  <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase ${inq.status === 'Nouveau' ? 'bg-blue-50 dark:bg-blue-950/20 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-900/50' : 'bg-green-50 dark:bg-green-950/20 text-green-600 dark:text-green-400 border border-green-200 dark:border-green-900/50'}`}>{inq.status}</span>
                </div>
                <div className="flex gap-2 mt-4 pt-3 border-t border-neutral-200 dark:border-neutral-800">
                  {inq.status !== 'Traité' && <button onClick={() => handleMarkAsProcessed(inq.id)} className="px-3 py-1.5 rounded-lg bg-green-50 dark:bg-green-950/20 text-green-600 dark:text-green-400 text-xs font-bold border border-green-200 dark:border-green-900/50 hover:bg-green-100 dark:hover:bg-green-950/40 transition-all">Marquer traité</button>}
                  <button onClick={() => handleDeleteInquiry(inq.id)} className="px-3 py-1.5 rounded-lg bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 text-xs font-bold border border-red-200 dark:border-red-900/50 hover:bg-red-100 dark:hover:bg-red-950/40 transition-all">Supprimer</button>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeAdminTab === 'settings' && (
          <div className="bg-white dark:bg-[#121214] border border-neutral-200 dark:border-neutral-900 rounded-2xl p-8 shadow-sm space-y-6">
            <h3 className="text-lg font-serif text-neutral-900 dark:text-white">Paramètres du site</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase tracking-wider text-neutral-500 dark:text-neutral-400 font-bold block">{t('companyName')}</label>
                <input type="text" value={siteSettings.companyName || ''} onChange={(e) => setSiteSettings({...siteSettings, companyName: e.target.value})} className="w-full bg-white dark:bg-[#0D0D0D] border border-neutral-200 dark:border-neutral-800 focus:border-[#D4AF37] rounded-xl py-2 px-3 text-sm text-neutral-900 dark:text-white focus:outline-none" />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase tracking-wider text-neutral-500 dark:text-neutral-400 font-bold block">Adresse</label>
                <input type="text" value={siteSettings.address || ''} onChange={(e) => setSiteSettings({...siteSettings, address: e.target.value})} className="w-full bg-white dark:bg-[#0D0D0D] border border-neutral-200 dark:border-neutral-800 focus:border-[#D4AF37] rounded-xl py-2 px-3 text-sm text-neutral-900 dark:text-white focus:outline-none" />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase tracking-wider text-neutral-500 dark:text-neutral-400 font-bold block">Téléphone</label>
                <input type="text" value={siteSettings.phone || ''} onChange={(e) => setSiteSettings({...siteSettings, phone: e.target.value})} className="w-full bg-white dark:bg-[#0D0D0D] border border-neutral-200 dark:border-neutral-800 focus:border-[#D4AF37] rounded-xl py-2 px-3 text-sm text-neutral-900 dark:text-white focus:outline-none" />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase tracking-wider text-neutral-500 dark:text-neutral-400 font-bold block">Email</label>
                <input type="text" value={siteSettings.email || ''} onChange={(e) => setSiteSettings({...siteSettings, email: e.target.value})} className="w-full bg-white dark:bg-[#0D0D0D] border border-neutral-200 dark:border-neutral-800 focus:border-[#D4AF37] rounded-xl py-2 px-3 text-sm text-neutral-900 dark:text-white focus:outline-none" />
              </div>
            </div>
            <button onClick={handleSaveSettings} className="px-8 py-3 rounded-xl bg-[#D4AF37] hover:bg-[#D4AF37]/90 text-neutral-950 font-bold text-xs uppercase tracking-wider transition-all shadow-lg">{t('save')}</button>
          </div>
        )}
      </section>
    );
  };

  return (
    <div lang={lang} className={`min-h-screen overflow-x-hidden w-full font-sans antialiased ${theme === 'dark' ? 'bg-[#0A0A0B] text-white' : 'bg-[#F8F9FA] text-neutral-900'}`}>

      {/* Кастомная нотификация */}
      {notification && (
        <div className={`fixed top-6 right-6 z-[200] px-6 py-4 rounded-2xl shadow-2xl border text-sm font-semibold animate-fadeIn ${
          notification.type === 'success' ? 'bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-400 border-green-200 dark:border-green-900/50' :
          notification.type === 'error' ? 'bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400 border-red-200 dark:border-red-900/50' :
          'bg-[#D4AF37]/10 text-[#D4AF37] border-[#D4AF37]/30'
        }`}>
          {notification.msg}
        </div>
      )}

      {/* Хэдер */}
      <header className="bg-white dark:bg-[#0A0A0B] border-b border-neutral-200 dark:border-neutral-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-1 flex items-center justify-between">
          <div onClick={() => { setCurrentView('home'); setSelectedCar(null); window.scrollTo({ top: 0 }); }} className="cursor-pointer flex items-center gap-1">
            <img src="/logo.png" alt="Ligo Automobiles Logo" className="h-24 sm:h-32 md:h-40 w-auto -my-6 md:-my-10 dark:invert dark:hue-rotate-180 mix-blend-multiply dark:mix-blend-screen" />
          </div>
          <nav className="hidden md:flex items-center gap-12 lg:gap-20 text-sm uppercase tracking-widest font-semibold">
            <button onClick={() => { setCurrentView('catalog'); window.scrollTo({ top: 0 }); }} className="text-neutral-600 dark:text-neutral-400 hover:text-[#D4AF37] transition-colors">{t('catalog')}</button>
            <a href="#propos" onClick={(e) => { e.preventDefault(); setCurrentView('home'); setTimeout(() => document.getElementById('propos')?.scrollIntoView({ behavior: 'smooth' }), 100); }} className="text-neutral-600 dark:text-neutral-400 hover:text-[#D4AF37] transition-colors">{t('about')}</a>
            <a href="#contact" onClick={(e) => { e.preventDefault(); setCurrentView('home'); setTimeout(() => document.getElementById('contact')?.scrollIntoView({ behavior: 'smooth' }), 100); }} className="text-neutral-600 dark:text-neutral-400 hover:text-[#D4AF37] transition-colors">{t('contact')}</a>
          </nav>
          <div className="flex items-center gap-2 md:gap-3">
            <div className="flex items-center bg-neutral-100 dark:bg-[#121214] border border-neutral-200 dark:border-neutral-800 rounded-xl overflow-hidden">
              {['fr', 'en', 'ru'].map(l => (
                <button key={l} onClick={() => setLang(l)} className={`px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider transition-all ${lang === l ? 'bg-[#D4AF37] text-neutral-950' : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'}`}>{l}</button>
              ))}
            </div>
            <button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} className="p-2.5 rounded-xl bg-neutral-100 dark:bg-[#121214] border border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-400 hover:text-[#D4AF37] hover:border-[#D4AF37] transition-all" title={theme === 'dark' ? t('lightMode') : t('darkMode')}>
              {theme === 'dark' ? <Icons.Sun /> : <Icons.Moon />}
            </button>
            <button onClick={() => isAdmin ? (setCurrentView('admin'), window.scrollTo({top:0})) : setShowAdminLoginModal(true)} className="p-2.5 rounded-xl bg-neutral-100 dark:bg-[#121214] border border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-400 hover:text-[#D4AF37] hover:border-[#D4AF37] transition-all" title={t('adminPanel')}>
              {isAdmin ? <Icons.Unlock /> : <Icons.Lock />}
            </button>
          </div>
        </div>
      </header>

      {/* Hero banner */}
      {currentView === 'home' && (
        <section className="relative min-h-[85vh] flex items-center justify-center overflow-hidden">
          <div className="absolute inset-0 z-0">
            <img src={siteSettings.bannerImage || "https://images.unsplash.com/photo-1614162692292-7ac56d7f7f1e?auto=format&fit=crop&q=80&w=1920"} alt="Hero" className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/60 to-black/40 dark:from-black/90 dark:to-black/60"></div>
          </div>
          
          <div className="relative z-10 max-w-[90rem] mx-auto px-4 sm:px-6 lg:px-8 w-full py-24 flex flex-col items-center text-center">
            <div className="w-full space-y-10 flex flex-col items-center">
              <div className="inline-flex items-center gap-3 bg-white/10 backdrop-blur-md px-5 py-2.5 rounded-full border border-white/20 shadow-sm">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-[#D4AF37] text-white">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                </span>
                <span className="text-sm uppercase tracking-widest text-white font-bold">
                  {siteSettings[lang]?.bannerSubtitle || DEFAULT_SETTINGS[lang].bannerSubtitle}
                </span>
              </div>
              <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-[5.5rem] max-w-6xl mx-auto w-full font-serif tracking-tight text-white leading-[1.15] font-black drop-shadow-2xl">
                {siteSettings[lang]?.bannerTitle || DEFAULT_SETTINGS[lang].bannerTitle}
              </h1>
              <p className="text-white/90 font-light leading-relaxed text-lg sm:text-xl md:text-2xl max-w-3xl mx-auto drop-shadow-lg">
                {siteSettings[lang]?.bannerDescription || DEFAULT_SETTINGS[lang].bannerDescription}
              </p>
              
              {/* 3 Cards */}
              <div className="flex flex-col sm:flex-row gap-6 pt-12 w-full justify-center max-w-6xl">
                <div className="flex-1 bg-black/40 backdrop-blur-md rounded-2xl p-5 flex flex-col items-center justify-center text-center shadow-lg border border-white/20 hover:bg-black/60 transition-colors">
                  <div className="text-[11px] md:text-[13px] font-serif font-black text-[#D4AF37] mb-2 leading-tight drop-shadow uppercase">{siteSettings[lang]?.stat1Title || DEFAULT_SETTINGS[lang]?.stat1Title || t('stat1Title')}</div>
                  <p className="text-[9px] md:text-[10px] uppercase tracking-widest text-white font-bold drop-shadow">{siteSettings[lang]?.stat1Sub || DEFAULT_SETTINGS[lang]?.stat1Sub || t('stat1Sub')}</p>
                </div>
                <div className="flex-1 bg-black/40 backdrop-blur-md rounded-2xl p-5 flex flex-col items-center justify-center text-center shadow-lg border border-white/20 hover:bg-black/60 transition-colors">
                  <div className="text-[11px] md:text-[13px] font-serif font-black text-[#D4AF37] mb-2 leading-tight drop-shadow uppercase">{siteSettings[lang]?.stat2Title || DEFAULT_SETTINGS[lang]?.stat2Title || t('stat2Title')}</div>
                  <p className="text-[9px] md:text-[10px] uppercase tracking-widest text-white font-bold drop-shadow">{siteSettings[lang]?.stat2Sub || DEFAULT_SETTINGS[lang]?.stat2Sub || t('stat2Sub')}</p>
                </div>
                <div className="flex-1 bg-black/40 backdrop-blur-md rounded-2xl p-5 flex flex-col items-center justify-center text-center shadow-lg border border-white/20 hover:bg-black/60 transition-colors">
                  <div className="text-[11px] md:text-[13px] font-serif font-black text-[#D4AF37] mb-2 leading-tight drop-shadow uppercase">{siteSettings[lang]?.stat3Title || DEFAULT_SETTINGS[lang]?.stat3Title || t('stat3Title')}</div>
                  <p className="text-[9px] md:text-[10px] uppercase tracking-widest text-white font-bold drop-shadow">{siteSettings[lang]?.stat3Sub || DEFAULT_SETTINGS[lang]?.stat3Sub || t('stat3Sub')}</p>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Featured vehicles on home */}
      {currentView === 'home' && (
        <>
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="text-center space-y-3 mb-12">
            <span className="text-xs uppercase tracking-widest text-[#D4AF37] font-semibold">{siteSettings[lang]?.featuredCategory || DEFAULT_SETTINGS[lang]?.featuredCategory || t('ourSelection')}</span>
            <h2 className="text-3xl font-serif text-neutral-900 dark:text-white tracking-wide">{siteSettings[lang]?.featuredTitle || DEFAULT_SETTINGS[lang]?.featuredTitle || t('featuredVehicles')}</h2>
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
              <p className="text-neutral-600 dark:text-neutral-400 text-sm font-light">{siteSettings[lang]?.featuredSubtitle || DEFAULT_SETTINGS[lang]?.featuredSubtitle || t('featuredDescription')}</p>
              <button onClick={() => { setCurrentView('catalog'); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className="px-6 py-3 rounded-2xl border border-[#D4AF37]/30 hover:border-[#D4AF37] text-[#D4AF37] hover:bg-[#D4AF37] hover:text-neutral-950 font-bold text-xs uppercase tracking-widest transition-all duration-300 whitespace-nowrap">
                {t('browseEntireCatalog').replace('{count}', String(cars.length))}
              </button>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {cars.slice(0, 6).map((car) => (
              <div 
                key={car.id}
                className="group relative bg-white dark:bg-[#121214] border border-neutral-200 dark:border-neutral-900 hover:border-[#D4AF37] rounded-3xl overflow-hidden transition-all duration-500 flex flex-col hover:shadow-2xl hover:-translate-y-1"
              >
                {/* Картинка и плашки */}
                <div 
                  onClick={() => handleSelectCar(car)}
                  className="relative aspect-[16/10] overflow-hidden bg-neutral-950 cursor-pointer"
                >
                  <img 
                    src={car.image || getFallbackSvg(800, 500, 24, 3)} 
                    alt={`${car.brand} ${car.model}`}
                    className={`w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-700 ${car.status === 'Vendu' ? 'grayscale opacity-60' : ''}`}
                    onError={(e) => {
                      const fallback = getFallbackSvg(800, 500, 24, 3);
                      if (e.currentTarget.src !== fallback) {
                        e.currentTarget.src = fallback;
                      }
                    }}
                  />
                  <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-white dark:from-[#121214] to-transparent"></div>
                  
                  {/* Статус-бейдж */}
                  <div className="absolute top-4 left-4 flex flex-col gap-2">
                    <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest ${
                      car.status === 'Vendu' 
                        ? 'bg-neutral-900 text-neutral-400 border border-neutral-800' 
                        : car.status === 'En arrivage'
                          ? 'bg-amber-950/40 text-amber-400 border border-amber-900/50'
                          : 'bg-green-950/40 text-green-400 border border-green-900/50'
                    }`}>
                      {t(car.status)}
                    </span>
                    {car.verifiedVin && (
                      <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/95 dark:bg-[#121214]/95 border border-[#D4AF37]/40 text-[#D4AF37] text-[10px] font-bold uppercase tracking-widest">
                        <Icons.CheckBadge />
                        {t('vinVerified')}
                      </span>
                    )}
                  </div>
                </div>

                {/* Основное описание */}
                <div className="p-6 flex-1 flex flex-col justify-between">
                  <div className="space-y-4">
                    <div className="flex items-start justify-between gap-4">
                      <div onClick={() => handleSelectCar(car)} className="cursor-pointer">
                        <span className="text-xs uppercase tracking-widest text-neutral-500 dark:text-neutral-400 font-medium">{car.brand}</span>
                        <h3 className="text-xl font-bold text-neutral-900 dark:text-white group-hover:text-[#D4AF37] transition-colors">{car.model}</h3>
                      </div>
                      <div className="text-right">
                        <div className="text-xl font-serif font-black text-[#D4AF37]">
                          {car.price ? car.price.toLocaleString('fr-FR') : '0'} €
                        </div>
                      </div>
                    </div>

                    {/* Краткие технические характеристики */}
                    <div className="grid grid-cols-2 gap-y-3 gap-x-4 pt-4 border-t border-neutral-200 dark:border-neutral-800 text-xs text-neutral-500 dark:text-neutral-400">
                      <div className="flex items-center gap-2">
                        <Icons.Calendar />
                        <span>{car.year}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Icons.Gauge />
                        <span>{car.km ? car.km.toLocaleString('fr-FR') : '0'} km</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Icons.Fuel />
                        <span>{t(car.fuel)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Icons.Activity />
                        <span>{car.hp} {t('hp')}</span>
                      </div>
                    </div>
                  </div>

                  {/* Кнопки управления и просмотра */}
                  <div className="mt-6 pt-4 border-t border-neutral-200 dark:border-neutral-800 flex items-center justify-between gap-3">
                    <button 
                      onClick={() => handleSelectCar(car)}
                      className="flex-1 py-3.5 px-4 bg-transparent hover:bg-[#D4AF37] hover:text-neutral-950 text-[#D4AF37] border border-[#D4AF37]/30 hover:border-[#D4AF37] uppercase tracking-widest transition-all duration-300 rounded-xl font-bold text-xs"
                    >
                      {t('details')}
                    </button>
                    
                    {isAdmin && (
                      <div className="flex gap-2">
                        <button 
                          onClick={() => handleOpenEditModal(car)}
                          className="p-3 rounded-xl bg-neutral-900 hover:bg-[#D4AF37]/10 border border-neutral-200 dark:border-neutral-800 hover:border-[#D4AF37] text-neutral-400 hover:text-[#D4AF37] transition-all"
                          title={t('edit')}
                        >
                          <Icons.Edit />
                        </button>
                        <button 
                          onClick={() => setDeleteConfirmCar(car)}
                          className="p-3 rounded-xl bg-neutral-900 hover:bg-red-950/45 border border-neutral-200 dark:border-neutral-800 hover:border-red-650 text-neutral-400 hover:text-red-400 transition-all"
                          title={t('delete')}
                        >
                          <Icons.Trash />
                        </button>
                      </div>
                    )}
                  </div>

                </div>
              </div>
            ))}
          </div>
        </section>
        </>
      )}

      {/* Car details page */}
      {currentView === 'car-details' && selectedCar && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <button onClick={() => { setCurrentView(previousView || 'home'); setSelectedCar(null); window.scrollTo({ top: 0 }); }} className="flex items-center gap-2 text-neutral-600 dark:text-neutral-400 hover:text-[#D4AF37] text-xs uppercase tracking-widest font-bold mb-8 transition-colors">
            <Icons.ArrowLeft /> {t('backToCatalog')}
          </button>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            {/* Image gallery */}
            <div className="space-y-4">
              <div className="relative aspect-[4/3] rounded-2xl overflow-hidden bg-neutral-200 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 cursor-pointer" onClick={() => { setLightboxIndex(currentCarGallery.indexOf(activeImage) || 0); setShowLightbox(true); }}>
                <img src={activeImage || selectedCar.image || getFallbackSvg()} alt={`${selectedCar.brand} ${selectedCar.model}`} className="w-full h-full object-cover" onError={(e) => { const fb = getFallbackSvg(); if (e.currentTarget.src !== fb) e.currentTarget.src = fb; }} />
                <div className="absolute top-4 right-4 p-2 rounded-full bg-white/80 dark:bg-black/60 text-neutral-700 dark:text-neutral-300"><Icons.Maximize /></div>
              </div>
              {currentCarGallery.length > 1 && (
                <div className="flex gap-2 overflow-x-auto pb-2">
                  {currentCarGallery.map((img, idx) => (
                    <button key={idx} onClick={() => setActiveImage(img)} className={`relative w-20 h-14 rounded-lg overflow-hidden border transition-all flex-shrink-0 ${activeImage === img ? 'border-[#D4AF37] ring-2 ring-[#D4AF37]/20' : 'border-neutral-200 dark:border-neutral-800 opacity-60 hover:opacity-100'}`}>
                      <img src={img} className="w-full h-full object-cover" onError={(e) => { const fb = getFallbackSvg(400, 250, 16, 2); if (e.currentTarget.src !== fb) e.currentTarget.src = fb; }} />
                    </button>
                  ))}
                </div>
              )}
            </div>
            {/* Car info */}
            <div className="space-y-6">
              <div>
                <span className="text-xs uppercase tracking-widest text-[#D4AF37] font-bold">{selectedCar.brand}</span>
                <h1 className="text-4xl font-serif font-black text-neutral-900 dark:text-white mt-1">{selectedCar.model}</h1>
                <div className="text-4xl font-serif font-black text-[#D4AF37] mt-3 mb-6">{selectedCar.price ? selectedCar.price.toLocaleString('fr-FR') : '0'} €</div>
              </div>
              
              {(() => {
                const desc = lang === 'en' && selectedCar.description_en 
                  ? selectedCar.description_en 
                  : lang === 'ru' && selectedCar.description_ru 
                    ? selectedCar.description_ru 
                    : selectedCar.description;
                return desc ? <p className="text-neutral-600 dark:text-neutral-400 font-light leading-relaxed whitespace-pre-line">{desc}</p> : null;
              })()}
              
              <div className="flex gap-4 border-b border-neutral-200 dark:border-neutral-800 overflow-x-auto">
                {['specs', 'testdrive'].map(tab => (
                  <button key={tab} onClick={() => setActiveDetailsTab(tab)} className={`py-3 text-xs font-bold uppercase tracking-widest whitespace-nowrap border-b-2 transition-all ${activeDetailsTab === tab ? 'border-[#D4AF37] text-[#D4AF37]' : 'border-transparent text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-300'}`}>
                    {tab === 'specs' ? t('specifications') : tab === 'finance' ? t('financing') : tab === 'paperwork' ? t('procedures') : t('testDrive')}
                  </button>
                ))}
              </div>

              {activeDetailsTab === 'specs' && (
                <div className="bg-neutral-50 dark:bg-[#121214] rounded-3xl p-8 space-y-6">
                  <h3 className="text-xs font-bold uppercase tracking-widest text-[#D4AF37]">{t('techSpecs')}</h3>
                  <div className="grid grid-cols-2 gap-y-8 gap-x-4">
                    <div className="flex flex-col"><span className="text-[10px] uppercase tracking-wider font-bold text-neutral-500 mb-1">{t('modelYear')}</span><span className="font-semibold text-neutral-900 dark:text-white">{selectedCar.year}</span></div>
                    <div className="flex flex-col"><span className="text-[10px] uppercase tracking-wider font-bold text-neutral-500 mb-1">{t('mileage')}</span><span className="font-semibold text-neutral-900 dark:text-white">{selectedCar.km ? selectedCar.km.toLocaleString('fr-FR') : '0'} km</span></div>
                    <div className="flex flex-col"><span className="text-[10px] uppercase tracking-wider font-bold text-neutral-500 mb-1">{t('fuel')}</span><span className="font-semibold text-neutral-900 dark:text-white">{t(selectedCar.fuel)}</span></div>
                    <div className="flex flex-col"><span className="text-[10px] uppercase tracking-wider font-bold text-neutral-500 mb-1">{t('transmission')}</span><span className="font-semibold text-neutral-900 dark:text-white">{t(selectedCar.transmission)}</span></div>
                    <div className="flex flex-col"><span className="text-[10px] uppercase tracking-wider font-bold text-neutral-500 mb-1">{t('enginePower')}</span><span className="font-semibold text-neutral-900 dark:text-white">{selectedCar.hp} {t('hp')}</span></div>
                    <div className="flex flex-col"><span className="text-[10px] uppercase tracking-wider font-bold text-neutral-500 mb-1">{t('co2Emissions')}</span><span className="font-semibold text-neutral-900 dark:text-white">{selectedCar.co2} CV</span></div>
                  </div>

                  {selectedCar.vin && (
                    <div className="pt-4 border-t border-neutral-200 dark:border-neutral-800 flex items-center justify-between">
                      <div><span className="text-xs text-neutral-500 dark:text-neutral-400">{t('vinCertified')}</span><div className="text-sm font-mono text-neutral-900 dark:text-white font-bold mt-0.5">{selectedCar.vin}</div></div>
                      <button onClick={() => handleCopyVIN(selectedCar.vin)} className="px-3 py-1.5 rounded-lg bg-neutral-100 dark:bg-[#0D0D0D] border border-neutral-200 dark:border-neutral-800 text-xs font-bold text-neutral-600 dark:text-neutral-400 hover:text-[#D4AF37] hover:border-[#D4AF37] transition-all">{t('copy')}</button>
                    </div>
                  )}

                  {/* Contact Buttons */}
                  <div className="flex flex-col sm:flex-row gap-4 pt-6 border-t border-neutral-200 dark:border-neutral-800">
                    <a href={`https://wa.me/${siteSettings.whatsapp?.replace(/[^0-9]/g, '')}`} target="_blank" rel="noopener noreferrer" className="flex-1 flex items-center justify-center gap-2 bg-[#25D366] hover:bg-[#20bd5a] text-white px-6 py-3.5 rounded-xl font-bold transition-colors shadow-sm">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z"/></svg>
                      WhatsApp
                    </a>
                    <a href={`tel:${siteSettings.phone?.replace(/[^0-9+]/g, '')}`} className="flex-1 flex items-center justify-center gap-2 bg-white dark:bg-[#1A1A1C] border border-neutral-200 dark:border-neutral-800 hover:border-[#D4AF37] text-neutral-900 dark:text-white px-6 py-3.5 rounded-xl font-bold transition-colors shadow-sm">
                      <Icons.Phone />
                      {t('callUs')}
                    </a>
                  </div>
                </div>
              )}



              {activeDetailsTab === 'testdrive' && (
                <div className="bg-white dark:bg-[#121214] border border-neutral-200 dark:border-neutral-900 rounded-2xl p-6">
                  <h3 className="text-sm font-serif font-bold text-neutral-900 dark:text-white mb-4">{t('bookTestDrive')}</h3>
                  <form onSubmit={handleTestDriveSubmit} className="space-y-3">
                    <input type="text" placeholder={t('fullName')} value={testDriveForm.name} onChange={(e) => setTestDriveForm({...testDriveForm, name: e.target.value})} className="w-full bg-neutral-50 dark:bg-[#0D0D0D] border border-neutral-200 dark:border-neutral-800 focus:border-[#D4AF37] rounded-xl py-2.5 px-4 text-sm text-neutral-900 dark:text-white focus:outline-none" required />
                    <input type="email" placeholder={t('email')} value={testDriveForm.email} onChange={(e) => setTestDriveForm({...testDriveForm, email: e.target.value})} className="w-full bg-neutral-50 dark:bg-[#0D0D0D] border border-neutral-200 dark:border-neutral-800 focus:border-[#D4AF37] rounded-xl py-2.5 px-4 text-sm text-neutral-900 dark:text-white focus:outline-none" required />
                    <input type="tel" placeholder={t('phone')} value={testDriveForm.phone} onChange={(e) => setTestDriveForm({...testDriveForm, phone: e.target.value})} className="w-full bg-neutral-50 dark:bg-[#0D0D0D] border border-neutral-200 dark:border-neutral-800 focus:border-[#D4AF37] rounded-xl py-2.5 px-4 text-sm text-neutral-900 dark:text-white focus:outline-none" required />
                    <div className="grid grid-cols-2 gap-3">
                      <div><label className="text-xs text-neutral-500 dark:text-neutral-400 block mb-1">{t('preferredDate')}</label><input type="date" value={testDriveForm.date} onChange={(e) => setTestDriveForm({...testDriveForm, date: e.target.value})} className="w-full bg-neutral-50 dark:bg-[#0D0D0D] border border-neutral-200 dark:border-neutral-800 focus:border-[#D4AF37] rounded-xl py-2.5 px-4 text-sm text-neutral-900 dark:text-white focus:outline-none" required /></div>
                      <div><label className="text-xs text-neutral-500 dark:text-neutral-400 block mb-1">{t('preferredTime')}</label><input type="time" value={testDriveForm.time} onChange={(e) => setTestDriveForm({...testDriveForm, time: e.target.value})} className="w-full bg-neutral-50 dark:bg-[#0D0D0D] border border-neutral-200 dark:border-neutral-800 focus:border-[#D4AF37] rounded-xl py-2.5 px-4 text-sm text-neutral-900 dark:text-white focus:outline-none" /></div>
                    </div>
                    <textarea rows="2" placeholder={t('specialRequest')} value={testDriveForm.comment} onChange={(e) => setTestDriveForm({...testDriveForm, comment: e.target.value})} className="w-full bg-neutral-50 dark:bg-[#0D0D0D] border border-neutral-200 dark:border-neutral-800 focus:border-[#D4AF37] rounded-xl py-2.5 px-4 text-sm text-neutral-900 dark:text-white focus:outline-none resize-none"></textarea>
                    <button type="submit" className="w-full py-3 rounded-xl bg-[#D4AF37] hover:bg-[#D4AF37]/90 text-neutral-950 font-bold transition-all">{t('sendRequest')}</button>
                  </form>
                </div>
              )}


            </div>
          </div>
        </section>
      )}

      {/* Catalog page */}
      {(currentView === 'catalog' || (currentView === 'home' && false)) && (
        <>
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative">
        {/* Sticky Back Button */}
        <div className="sticky top-[80px] z-40 bg-[#F8F9FA]/90 dark:bg-[#0D0D0D]/90 backdrop-blur-md py-4 border-b border-neutral-200 dark:border-neutral-900 mb-8 -mx-4 px-4 sm:mx-0 sm:px-0">
          <button onClick={() => { setCurrentView('home'); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className="flex items-center gap-2 text-neutral-600 dark:text-neutral-400 hover:text-[#D4AF37] text-xs uppercase tracking-widest font-bold transition-colors">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
            {t('backToHome')}
          </button>
        </div>

        <div className="text-center space-y-3 mb-12">
          <h2 className="text-4xl font-serif text-neutral-900 dark:text-white tracking-tight">{t('vehicleCatalogue')}</h2>
          <p className="text-neutral-600 dark:text-neutral-400 text-sm font-light">{t('vehicleCatalogueDesc')}</p>
        </div>

        {/* Интерактивная плашка фильтров */}
        {(activeAdminTab === 'vehicles' || !isAdmin) && (
          <>
        {/* Filters Toggle Button */}
        <div className="flex items-center justify-between bg-[#f8f9fa] dark:bg-[#1a1a1c] border border-neutral-900 dark:border-neutral-800 rounded-xl p-4 mb-6 shadow-sm cursor-pointer active:scale-[0.98] transition-transform w-full lg:w-1/3 xl:w-1/4" onClick={() => setShowMobileFilters(!showMobileFilters)}>
          <div className="flex items-center gap-3">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[#D4AF37]"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon></svg>
            <span className="font-bold text-neutral-900 dark:text-white uppercase text-sm tracking-widest">{lang === 'ru' ? 'Фильтры' : lang === 'fr' ? 'Filtres' : 'Filters'}</span>
          </div>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`text-neutral-500 transition-transform duration-300 ${showMobileFilters ? 'rotate-180' : ''}`}><polyline points="6 9 12 15 18 9"></polyline></svg>
        </div>

        <div className={`bg-white dark:bg-[#121214] border border-neutral-900 dark:border-neutral-900 rounded-2xl p-6 mb-12 shadow-lg ${showMobileFilters ? 'block' : 'hidden'}`}>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
            
            {/* Марка */}
            <div className="space-y-1.5">
              <label className="text-[10px] uppercase tracking-wider text-neutral-400 font-bold block">
                {t('brand')}
              </label>
              <select
                value={selectedBrand}
                onChange={(e) => { setSelectedBrand(e.target.value); setSelectedModel(''); }}
                className="w-full bg-white dark:bg-[#161618] border border-neutral-900 dark:border-neutral-800 focus:border-[#D4AF37] text-neutral-900 dark:text-white rounded-xl py-2.5 px-3 text-xs focus:outline-none transition-all appearance-none cursor-pointer"
              >
                <option value="">{t('all')}</option>
                {availableBrands.map(b => (
                  <option key={b} value={b}>{b}</option>
                ))}
              </select>
            </div>

            {/* Модель */}
            <div className="space-y-1.5">
              <label className="text-[10px] uppercase tracking-wider text-neutral-400 font-bold block">
                {lang === 'ru' ? 'Модель' : lang === 'fr' ? 'Modèle' : 'Model'}
              </label>
              <select
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
                disabled={!selectedBrand}
                className="w-full bg-white dark:bg-[#161618] border border-neutral-900 dark:border-neutral-800 focus:border-[#D4AF37] text-neutral-900 dark:text-white rounded-xl py-2.5 px-3 text-xs focus:outline-none transition-all appearance-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <option value="">{t('all')}</option>
                {availableModels.map(m => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>

            {/* Цена от */}
            <div className="space-y-1.5">
              <label className="text-[10px] uppercase tracking-wider text-neutral-400 font-bold block">
                {t('priceMin')}
              </label>
              <input
                type="number"
                placeholder={t('minPlaceholder')}
                value={priceMin}
                onChange={(e) => setPriceMin(e.target.value)}
                className="w-full bg-white dark:bg-[#161618] border border-neutral-900 dark:border-neutral-800 focus:border-[#D4AF37] text-neutral-900 dark:text-white placeholder-neutral-400 dark:placeholder-neutral-500 rounded-xl py-2.5 px-3 text-xs focus:outline-none transition-all"
              />
            </div>

            {/* Цена до */}
            <div className="space-y-1.5">
              <label className="text-[10px] uppercase tracking-wider text-neutral-400 font-bold block">
                {t('priceMax')}
              </label>
              <input
                type="number"
                placeholder={t('maxPlaceholder')}
                value={priceMax}
                onChange={(e) => setPriceMax(e.target.value)}
                className="w-full bg-white dark:bg-[#161618] border border-neutral-900 dark:border-neutral-800 focus:border-[#D4AF37] text-neutral-900 dark:text-white placeholder-neutral-400 dark:placeholder-neutral-500 rounded-xl py-2.5 px-3 text-xs focus:outline-none transition-all"
              />
            </div>

            {/* Год от */}
            <div className="space-y-1.5">
              <label className="text-[10px] uppercase tracking-wider text-neutral-400 font-bold block">
                {t('minYear')}
              </label>
              <input
                type="number"
                placeholder="Ex: 2020"
                value={yearMin}
                onChange={(e) => setYearMin(e.target.value)}
                className="w-full bg-white dark:bg-[#161618] border border-neutral-900 dark:border-neutral-800 focus:border-[#D4AF37] text-neutral-900 dark:text-white placeholder-neutral-400 dark:placeholder-neutral-500 rounded-xl py-2.5 px-3 text-xs focus:outline-none transition-all"
              />
            </div>

            {/* Год до */}
            <div className="space-y-1.5">
              <label className="text-[10px] uppercase tracking-wider text-neutral-400 font-bold block">
                {t('maxYear')}
              </label>
              <input
                type="number"
                placeholder="Ex: 2026"
                value={yearMax}
                onChange={(e) => setYearMax(e.target.value)}
                className="w-full bg-white dark:bg-[#161618] border border-neutral-900 dark:border-neutral-800 focus:border-[#D4AF37] text-neutral-900 dark:text-white placeholder-neutral-400 dark:placeholder-neutral-500 rounded-xl py-2.5 px-3 text-xs focus:outline-none transition-all"
              />
            </div>

            {/* Топливо */}
            <div className="space-y-1.5">
              <label className="text-[10px] uppercase tracking-wider text-neutral-400 font-bold block">
                {t('fuel')}
              </label>
              <select
                value={fuel}
                onChange={(e) => setFuel(e.target.value)}
                className="w-full bg-white dark:bg-[#161618] border border-neutral-900 dark:border-neutral-800 focus:border-[#D4AF37] text-neutral-900 dark:text-white rounded-xl py-2.5 px-3 text-xs focus:outline-none transition-all appearance-none cursor-pointer"
              >
                <option value="">{t('allTypes')}</option>
                {availableFuels.map(f => (
                  <option key={f} value={f}>{t(f)}</option>
                ))}
              </select>
            </div>

            {/* Коробка */}
            <div className="space-y-1.5">
              <label className="text-[10px] uppercase tracking-wider text-neutral-400 font-bold block">
                {t('transmission')}
              </label>
              <select
                value={transmission}
                onChange={(e) => setTransmission(e.target.value)}
                className="w-full bg-white dark:bg-[#161618] border border-neutral-900 dark:border-neutral-800 focus:border-[#D4AF37] text-neutral-900 dark:text-white rounded-xl py-2.5 px-3 text-xs focus:outline-none transition-all appearance-none cursor-pointer"
              >
                <option value="">{t('allTransmissions')}</option>
                <option value="Automatique">{t('Automatique')}</option>
                <option value="Mécanique">{t('Manuelle')}</option>
              </select>
            </div>

            {/* Статус */}
            <div className="space-y-1.5">
              <label className="text-[10px] uppercase tracking-wider text-neutral-400 font-bold block">
                {t('availability')}
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full bg-white dark:bg-[#161618] border border-neutral-900 dark:border-neutral-800 focus:border-[#D4AF37] text-neutral-900 dark:text-white rounded-xl py-2.5 px-3 text-xs focus:outline-none transition-all appearance-none cursor-pointer"
              >
                <option value="">{t('allStatuses')}</option>
                <option value="En stock">{t('En stock')}</option>
                <option value="En arrivage">{t('En arrivage')}</option>
                <option value="Vendu">{t('Vendu')}</option>
              </select>
            </div>

            {/* Текстовый поиск */}
            <div className="space-y-1.5 sm:col-span-2 md:col-span-3 lg:col-span-3 xl:col-span-3">
              <label className="text-[10px] uppercase tracking-wider text-neutral-400 font-bold block">
                {t('searchText')}
              </label>
              <div className="relative">
                <input
                  type="text"
                  placeholder={t('searchPlaceholder')}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-white dark:bg-[#161618] border border-neutral-900 dark:border-neutral-800 focus:border-[#D4AF37] text-neutral-900 dark:text-white placeholder-neutral-400 dark:placeholder-neutral-500 rounded-xl py-2.5 pl-10 pr-4 text-xs focus:outline-none transition-all"
                />
                <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-500 dark:text-neutral-400">
                  <Icons.Search />
                </div>
              </div>
            </div>

          </div>

          {/* Быстрый сброс фильтров */}
          {(searchQuery || selectedBrand || selectedModel || priceMin || priceMax || yearMin || yearMax || transmission || fuel || status) && (
            <div className="flex justify-end mt-4 pt-4 border-t border-neutral-200 dark:border-neutral-800">
              <button
                onClick={() => {
                  setSearchQuery('');
                  setSelectedBrand('');
                  setSelectedModel('');
                  setPriceMin('');
                  setPriceMax('');
                  setYearMin('');
                  setYearMax('');
                  setTransmission('');
                  setFuel('');
                  setStatus('');
                }}
                className="text-xs text-[#D4AF37] hover:underline font-semibold"
              >
                {t('clearFilters')}
              </button>
            </div>
          )}
        </div>

        {}
        {/* Индикатор загрузки базы */}
        {loading ? (
          <div className="py-24 text-center space-y-4">
            <div className="inline-block w-8 h-8 border-4 border-[#D4AF37] border-t-transparent rounded-full animate-spin"></div>
            <p className="text-neutral-600 text-sm font-mono tracking-wider">Mise à jour du catalogue...</p>
          </div>
        ) : filteredCars.length === 0 ? (
          <div className="py-24 text-center border border-dashed border-neutral-300 dark:border-neutral-900 rounded-2xl bg-white dark:bg-[#121214]">
            <p className="text-neutral-400 mb-2">{lang === 'ru' ? 'Ни один автомобиль не соответствует вашим критериям поиска.' : 'Aucun véhicule ne correspond à vos critères de recherche.'}</p>
            <button 
              onClick={() => {
                setSearchQuery('');
                setSelectedBrand('');
                setSelectedModel('');
                setPriceMin('');
                setPriceMax('');
                setYearMin('');
                setYearMax('');
                setTransmission('');
                setFuel('');
                setStatus('');
              }}
              className="text-[#D4AF37] hover:underline text-sm font-semibold"
            >
              {t('clearFilters')}
            </button>
          </div>
        ) : (
          /* Сетка автомобилей */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredCars.map((car) => (
              <div 
                key={car.id}
                className="group relative bg-white dark:bg-[#121214] border border-neutral-200 dark:border-neutral-900 hover:border-[#D4AF37] rounded-3xl overflow-hidden transition-all duration-500 flex flex-col hover:shadow-2xl hover:-translate-y-1"
              >
                {/* Картинка и плашки */}
                <div 
                  onClick={() => handleSelectCar(car)}
                  className="relative aspect-[16/10] overflow-hidden bg-neutral-950 cursor-pointer"
                >
                  <img 
                    src={car.image || getFallbackSvg(800, 500, 24, 3)} 
                    alt={`${car.brand} ${car.model}`}
                    className={`w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-700 ${car.status === 'Vendu' ? 'grayscale opacity-60' : ''}`}
                    onError={(e) => {
                      const fallback = getFallbackSvg(800, 500, 24, 3);
                      if (e.currentTarget.src !== fallback) {
                        e.currentTarget.src = fallback;
                      }
                    }}
                  />
                  <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-white dark:from-[#121214] to-transparent"></div>
                  
                  {/* Статус-бейдж */}
                  <div className="absolute top-4 left-4 flex flex-col gap-2">
                    <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest ${
                      car.status === 'Vendu' 
                        ? 'bg-neutral-900 text-neutral-400 border border-neutral-800' 
                        : car.status === 'En arrivage'
                          ? 'bg-amber-950/40 text-amber-400 border border-amber-900/50'
                          : 'bg-green-950/40 text-green-400 border border-green-900/50'
                    }`}>
                      {t(car.status)}
                    </span>
                    {car.verifiedVin && (
                      <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/95 dark:bg-[#121214]/95 border border-[#D4AF37]/40 text-[#D4AF37] text-[10px] font-bold uppercase tracking-widest">
                        <Icons.CheckBadge />
                        {t('vinVerified')}
                      </span>
                    )}
                  </div>
                </div>

                {/* Основное описание */}
                <div className="p-6 flex-1 flex flex-col justify-between">
                  <div className="space-y-4">
                    <div className="flex items-start justify-between gap-4">
                      <div onClick={() => handleSelectCar(car)} className="cursor-pointer">
                        <span className="text-xs uppercase tracking-widest text-neutral-500 dark:text-neutral-400 font-medium">{car.brand}</span>
                        <h3 className="text-xl font-bold text-neutral-900 dark:text-white group-hover:text-[#D4AF37] transition-colors">{car.model}</h3>
                      </div>
                      <div className="text-right">
                        <div className="text-xl font-serif font-black text-[#D4AF37]">
                          {car.price ? car.price.toLocaleString('fr-FR') : '0'} €
                        </div>
                      </div>
                    </div>

                    {/* Краткие технические характеристики */}
                    <div className="grid grid-cols-2 gap-y-3 gap-x-4 pt-4 border-t border-neutral-200 dark:border-neutral-800 text-xs text-neutral-500 dark:text-neutral-400">
                      <div className="flex items-center gap-2">
                        <Icons.Calendar />
                        <span>{car.year}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Icons.Gauge />
                        <span>{car.km ? car.km.toLocaleString('fr-FR') : '0'} km</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Icons.Fuel />
                        <span>{t(car.fuel)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Icons.Activity />
                        <span>{car.hp} {t('hp')}</span>
                      </div>
                    </div>
                  </div>

                  {/* Кнопки управления и просмотра */}
                  <div className="mt-6 pt-4 border-t border-neutral-200 dark:border-neutral-800 flex items-center justify-between gap-3">
                    <button 
                      onClick={() => handleSelectCar(car)}
                      className="flex-1 py-3.5 px-4 bg-transparent hover:bg-[#D4AF37] hover:text-neutral-950 text-[#D4AF37] border border-[#D4AF37]/30 hover:border-[#D4AF37] uppercase tracking-widest transition-all duration-300 rounded-xl font-bold text-xs"
                    >
                      {t('details')}
                    </button>
                    
                    {isAdmin && (
                      <div className="flex gap-2">
                        <button 
                          onClick={() => handleOpenEditModal(car)}
                          className="p-3 rounded-xl bg-neutral-900 hover:bg-[#D4AF37]/10 border border-neutral-200 dark:border-neutral-800 hover:border-[#D4AF37] text-neutral-400 hover:text-[#D4AF37] transition-all"
                          title={t('edit')}
                        >
                          <Icons.Edit />
                        </button>
                        <button 
                          onClick={() => setDeleteConfirmCar(car)}
                          className="p-3 rounded-xl bg-neutral-900 hover:bg-red-950/45 border border-neutral-200 dark:border-neutral-800 hover:border-red-650 text-neutral-400 hover:text-red-400 transition-all"
                          title={t('delete')}
                        >
                          <Icons.Trash />
                        </button>
                      </div>
                    )}
                  </div>

                </div>
              </div>
            ))}
          </div>
        )}
          </>
        )}

      </section>
        </>
      )}

      {currentView === 'admin' && isAdmin && renderAdminDashboard()}


      {currentView === 'home' && (
        <>
          {/* Секция о нас */}

          <section id="propos" className="bg-[#F1F3F5] dark:bg-[#0D0D0D] border-y border-neutral-200 dark:border-neutral-900 py-20 text-neutral-900 dark:text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <span className="text-xs uppercase tracking-widest text-[#D4AF37] font-semibold">{siteSettings[lang]?.aboutSubtitle || siteSettings.aboutSubtitle || DEFAULT_SETTINGS[lang]?.aboutSubtitle || "Ligo Automobiles"}</span>
              <h2 className="text-3xl sm:text-4xl font-serif text-neutral-900 dark:text-white tracking-wide leading-snug">
                {siteSettings[lang]?.aboutTitle || siteSettings.aboutTitle || DEFAULT_SETTINGS[lang]?.aboutTitle || t('aboutTitle')}
              </h2>
              <p className="text-neutral-600 dark:text-neutral-400 font-light leading-relaxed">
                {siteSettings[lang]?.aboutText || siteSettings.aboutText || DEFAULT_SETTINGS[lang]?.aboutText || t('aboutText')}
              </p>
            </div>
            <div className="relative aspect-[4/3] rounded-2xl overflow-hidden bg-neutral-200 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800">
              <img 
                src="https://images.unsplash.com/photo-1617814076367-b759c7d7e738?auto=format&fit=crop&q=80&w=1200" 
                alt="Studio photo" 
                className="w-full h-full object-cover opacity-90"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent"></div>
            </div>
          </div>
        </div>
      </section>

      {}
      {/* Форма контактов */}

      <section id="contact" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          
          <div className="lg:col-span-1 space-y-6">
            <div>
              <span className="text-xs uppercase tracking-widest text-[#D4AF37] font-semibold">{siteSettings[lang]?.contactSubtitle || siteSettings.contactSubtitle || t('contactUs')}</span>
              <h2 className="text-3xl font-serif text-neutral-900 dark:text-white tracking-wide mt-2">{siteSettings[lang]?.contactTitle || siteSettings.contactTitle || t('discussProject')}</h2>
            </div>
            <p className="text-neutral-600 dark:text-neutral-400 font-light leading-relaxed">
              {siteSettings[lang]?.contactDescription || siteSettings.contactDescription || t('contactDesc')}
            </p>
            <div className="space-y-4 pt-4 text-sm text-neutral-600 dark:text-neutral-300">
              <div className="flex items-center gap-3">
                <span className="text-[#D4AF37]"><Icons.MapPin /></span>
                <span>{siteSettings.address || "Paris, France"}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-[#D4AF37]"><Icons.Phone /></span>
                <span>{siteSettings.phone || "+33 7 66 75 32 23"}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-[#D4AF37]"><Icons.Mail /></span>
                <span>{siteSettings.email || "ligo.automobiles@gmail.com"}</span>
              </div>
            </div>
            <div className="pt-8 flex justify-start">
              <img src="/logo.png" alt="Ligo Automobiles Logo" className="w-48 sm:w-56 md:w-64 opacity-90 dark:invert dark:hue-rotate-180 mix-blend-multiply dark:mix-blend-screen" />
            </div>
          </div>

          {/* Форма обратной связи */}
          <div className="lg:col-span-2 bg-white dark:bg-[#121214] border border-neutral-200 dark:border-neutral-900 rounded-3xl p-8 sm:p-10 shadow-lg">
            <form onSubmit={(e) => { e.preventDefault(); showNotification(t('messageSent'), "success"); }} className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-xs uppercase tracking-widest text-neutral-600 dark:text-neutral-400 font-medium">{t('fullName')}</label>
                  <input required type="text" placeholder={t('namePlaceholder')} className="w-full bg-white dark:bg-[#0D0D0D] border border-neutral-200 dark:border-neutral-800 focus:border-[#D4AF37] rounded-xl py-3 px-4 text-neutral-900 dark:text-white placeholder-neutral-400 dark:placeholder-neutral-500 focus:outline-none transition-all" />
                </div>
                <div className="space-y-2">
                  <label className="text-xs uppercase tracking-widest text-neutral-600 dark:text-neutral-400 font-medium">{t('email')}</label>
                  <input required type="email" placeholder={t('emailPlaceholder')} className="w-full bg-white dark:bg-[#0D0D0D] border border-neutral-200 dark:border-neutral-800 focus:border-[#D4AF37] rounded-xl py-3 px-4 text-neutral-900 dark:text-white placeholder-neutral-400 dark:placeholder-neutral-500 focus:outline-none transition-all" />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs uppercase tracking-widest text-neutral-600 dark:text-neutral-400 font-medium">{t('phone')}</label>
                <input type="tel" placeholder={t('phonePlaceholder')} className="w-full bg-white dark:bg-[#0D0D0D] border border-neutral-200 dark:border-neutral-800 focus:border-[#D4AF37] rounded-xl py-3 px-4 text-neutral-900 dark:text-white placeholder-neutral-400 dark:placeholder-neutral-500 focus:outline-none transition-all" />
              </div>
              <div className="space-y-2">
                <label className="text-xs uppercase tracking-widest text-neutral-600 dark:text-neutral-400 font-medium">{t('messageLabel')}</label>
                <textarea required rows="4" placeholder={t('specialRequestPlaceholder')} className="w-full bg-white dark:bg-[#0D0D0D] border border-neutral-200 dark:border-neutral-800 focus:border-[#D4AF37] rounded-xl py-3 px-4 text-neutral-900 dark:text-white placeholder-neutral-400 dark:placeholder-neutral-500 focus:outline-none transition-all resize-none"></textarea>
              </div>
              <button type="submit" className="w-full py-4 rounded-2xl bg-[#D4AF37] hover:bg-[#D4AF37]/90 text-neutral-950 font-bold tracking-wide transition-all shadow-lg hover:shadow-[#D4AF37]/20">
                {t('sendRequest')}
              </button>
            </form>
          </div>
        </div>
      </section>
        </>
      )}


      {/* Подвал сайта */}
      <footer className="border-t border-neutral-200 dark:border-neutral-900 bg-[#F1F3F5] dark:bg-[#0D0D0D] py-12 text-center text-xs text-neutral-600 dark:text-neutral-400">
        <div className="max-w-7xl mx-auto px-4 space-y-4">
          <p className="tracking-widest font-serif font-bold text-neutral-300">{siteSettings.companyName || "Ligo Automobiles"}</p>
          <p>© {new Date().getFullYear()} {siteSettings.companyName || "Ligo Automobiles"}. {t('allRightsReserved')}. {siteSettings.address || "Paris, France"}.</p>
        </div>
      </footer>

      {/* Модальное окно авторизации админа */}
      {showAdminLoginModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md bg-white dark:bg-[#121214] border border-neutral-200 dark:border-neutral-900 rounded-2xl p-8 shadow-2xl relative">
            <button 
              onClick={() => setShowAdminLoginModal(false)}
              className="absolute top-4 right-4 p-2 text-neutral-400 hover:text-neutral-800 dark:hover:text-white transition-colors"
            >
              <Icons.X />
            </button>
            <div className="text-center mb-6">
              <h3 className="text-2xl font-serif text-neutral-900 dark:text-white mb-2">{t('adminSpace')}</h3>
              <p className="text-neutral-600 dark:text-neutral-400 dark:text-neutral-400 text-sm">{t('adminPasswordPrompt')}</p>
            </div>
            <form onSubmit={handleAdminLoginSubmit} className="space-y-4">
              <div className="space-y-2">
                <input 
                  type="password" 
                  placeholder={t('passwordPlaceholder')} 
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  className="w-full bg-neutral-50 dark:bg-[#0D0D0D] border border-neutral-200 dark:border-neutral-800 focus:border-[#D4AF37] rounded-xl py-3 px-4 text-center text-neutral-900 dark:text-white placeholder-neutral-400 dark:placeholder-neutral-500 focus:outline-none transition-all"
                  autoFocus
                />
              </div>
              <button 
                type="submit" 
                className="w-full py-3.5 rounded-xl bg-[#D4AF37] hover:bg-[#D4AF37]/90 text-neutral-950 font-bold tracking-wide transition-all"
              >{t('login')}</button>
            </form>
          </div>
        </div>
      )}

      {/* Модальное окно добавления/редактирования автомобиля */}
      {showAddEditModal && (
        <div id="add-edit-modal-wrapper" className="fixed inset-0 z-50 flex justify-center items-start p-4 bg-neutral-900/65 backdrop-blur-sm overflow-y-auto">
          <div className="relative w-full max-w-2xl bg-white border border-neutral-200 rounded-2xl overflow-hidden shadow-2xl my-8 p-8">
            <button 
              onClick={() => setShowAddEditModal(false)}
              className="absolute top-4 right-4 p-2 text-neutral-400 hover:text-neutral-800 transition-colors"
            >
              <Icons.X />
            </button>

            <h3 className="text-2xl font-serif text-neutral-900 mb-6 pb-4 border-b border-neutral-200">
              {carToEdit ? 'Modifier le véhicule' : 'Ajouter un véhicule au catalogue'}
            </h3>

            <form noValidate onSubmit={handleFormSubmit} className="space-y-8">
              
              {/* Section 1: Informations Générales */}
              <div>
                <div className="text-[11px] font-bold tracking-widest text-[#D4AF37] uppercase border-b border-neutral-200 pb-2 mb-4">{t('generalInfoStep')}</div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div className="space-y-1.5">
                    <label className="text-[10px] uppercase tracking-wider text-neutral-600 font-bold flex items-center">{t('brand')}<span className="text-red-500 font-bold ml-1">*</span>
                    </label>
                    <input 
                      id="form-brand" 
                      type="text" 
                      placeholder="ex: Porsche" 
                      value={formData.brand} 
                      onChange={(e) => {
                        setFormData({...formData, brand: e.target.value});
                        if (formErrors.brand) setFormErrors(prev => ({ ...prev, brand: false }));
                      }} 
                      className={`w-full bg-neutral-50 border rounded-xl py-2.5 px-4 text-neutral-900 placeholder-neutral-400 focus:outline-none transition-all ${
                        formErrors.brand 
                          ? 'border-red-500/80 focus:border-red-500 focus:ring-1 focus:ring-red-500/20' 
                          : 'border-neutral-200 focus:border-[#D4AF37]'
                      }`} 
                    />
                    {formErrors.brand && <span className="text-[9px] text-red-500 block">La marque est obligatoire.</span>}
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] uppercase tracking-wider text-neutral-600 font-bold flex items-center">{t('model')}<span className="text-red-500 font-bold ml-1">*</span>
                    </label>
                    <input 
                      id="form-model" 
                      type="text" 
                      placeholder="ex: 911 GT3 RS" 
                      value={formData.model} 
                      onChange={(e) => {
                        setFormData({...formData, model: e.target.value});
                        if (formErrors.model) setFormErrors(prev => ({ ...prev, model: false }));
                      }} 
                      className={`w-full bg-neutral-50 border rounded-xl py-2.5 px-4 text-neutral-900 placeholder-neutral-400 focus:outline-none transition-all ${
                        formErrors.model 
                          ? 'border-red-500/80 focus:border-red-500 focus:ring-1 focus:ring-red-500/20' 
                          : 'border-neutral-200 focus:border-[#D4AF37]'
                      }`} 
                    />
                    {formErrors.model && <span className="text-[9px] text-red-500 block">Le modèle est obligatoire.</span>}
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-5 mt-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] uppercase tracking-wider text-neutral-600 font-bold">{t('year')}</label>
                    <input 
                      type="number" 
                      value={formData.year} 
                      onChange={(e) => setFormData({...formData, year: e.target.value})} 
                      className="w-full bg-neutral-50 border border-neutral-200 focus:border-[#D4AF37] rounded-xl py-2.5 px-4 text-neutral-900 focus:outline-none transition-all" 
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] uppercase tracking-wider text-neutral-600 font-bold">{t('mileageKm')}</label>
                    <input 
                      type="number" 
                      value={formData.km} 
                      onChange={(e) => setFormData({...formData, km: e.target.value})} 
                      className="w-full bg-neutral-50 border border-neutral-200 focus:border-[#D4AF37] rounded-xl py-2.5 px-4 text-neutral-900 focus:outline-none transition-all" 
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] uppercase tracking-wider text-neutral-600 font-bold flex items-center">{t('priceEuro')}<span className="text-red-500 font-bold ml-1">*</span>
                    </label>
                    <input 
                      id="form-price" 
                      type="number" 
                      value={formData.price} 
                      onChange={(e) => {
                        setFormData({...formData, price: e.target.value});
                        if (formErrors.price) setFormErrors(prev => ({ ...prev, price: false }));
                      }} 
                      className={`w-full bg-neutral-50 border rounded-xl py-2.5 px-4 text-neutral-900 focus:outline-none transition-all ${
                        formErrors.price 
                          ? 'border-red-500/80 focus:border-red-500 focus:ring-1 focus:ring-red-500/20' 
                          : 'border-neutral-200 focus:border-[#D4AF37]'
                      }`} 
                    />
                    {formErrors.price && <span className="text-[9px] text-red-500 block">Prix obligatoire (&gt; 0).</span>}
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] uppercase tracking-wider text-neutral-600 font-bold">{t('powerHp')}</label>
                    <input 
                      type="number" 
                      value={formData.hp} 
                      onChange={(e) => setFormData({...formData, hp: e.target.value})} 
                      className="w-full bg-neutral-50 border border-neutral-200 focus:border-[#D4AF37] rounded-xl py-2.5 px-4 text-neutral-900 focus:outline-none transition-all" 
                    />
                  </div>
                </div>
              </div>

              {/* Section 2: Spécifications Techniques */}
              <div>
                <div className="text-[11px] font-bold tracking-widest text-[#D4AF37] uppercase border-b border-neutral-200 pb-2 mb-4">{t('techSpecsStep')}</div>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-5">
                  <div className="space-y-1.5">
                    <label className="text-[10px] uppercase tracking-wider text-neutral-600 font-bold">{t('fuel')}</label>
                    <select 
                      value={formData.fuel} 
                      onChange={(e) => setFormData({...formData, fuel: e.target.value})} 
                      className="w-full bg-neutral-50 border border-neutral-200 focus:border-[#D4AF37] rounded-xl py-2.5 px-4 text-neutral-900 focus:outline-none transition-all cursor-pointer"
                    >
                      <option value="Essence">{t('Essence')}</option>
                      <option value="Diesel">{t('Diesel')}</option>
                      <option value="Hybride">{t('Hybride')}</option>
                      <option value="Électrique">{t('Electrique')}</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] uppercase tracking-wider text-neutral-600 font-bold">{t('transmission')}</label>
                    <select 
                      value={formData.transmission} 
                      onChange={(e) => setFormData({...formData, transmission: e.target.value})} 
                      className="w-full bg-neutral-50 border border-neutral-200 focus:border-[#D4AF37] rounded-xl py-2.5 px-4 text-neutral-900 focus:outline-none transition-all cursor-pointer"
                    >
                      <option value="Automatique">{t('Automatique')}</option>
                      <option value="Mécanique">{t('Mécanique')}</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] uppercase tracking-wider text-neutral-600 font-bold">{t('status')}</label>
                    <select 
                      value={formData.status} 
                      onChange={(e) => setFormData({...formData, status: e.target.value})} 
                      className="w-full bg-neutral-50 border border-neutral-200 focus:border-[#D4AF37] rounded-xl py-2.5 px-4 text-neutral-900 focus:outline-none transition-all cursor-pointer"
                    >
                      <option value="En stock">{t('En stock')}</option>
                      <option value="En arrivage">{t('En arrivage')}</option>
                      <option value="Vendu">{t('Vendu')}</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] uppercase tracking-wider text-neutral-600 font-bold">{t('co2gkm')}</label>
                    <input 
                      type="number" 
                      value={formData.co2} 
                      onChange={(e) => setFormData({...formData, co2: e.target.value})} 
                      className="w-full bg-neutral-50 border border-neutral-200 focus:border-[#D4AF37] rounded-xl py-2.5 px-4 text-neutral-900 focus:outline-none transition-all" 
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mt-4 items-end">
                  <div className="sm:col-span-2 space-y-1.5">
                    <label className="text-[10px] uppercase tracking-wider text-neutral-600 font-bold">{t('vin')}</label>
                    <input 
                      type="text" 
                      placeholder="ex: WP0ZZZ99Z..." 
                      value={formData.vin} 
                      onChange={(e) => setFormData({...formData, vin: e.target.value})} 
                      className="w-full bg-neutral-50 border border-neutral-200 focus:border-[#D4AF37] rounded-xl py-2.5 px-4 text-neutral-900 placeholder-neutral-400 focus:outline-none transition-all" 
                    />
                  </div>
                  <div className="flex items-center gap-2 pb-3 cursor-pointer select-none">
                    <input 
                      type="checkbox" 
                      id="verifiedVinCheck" 
                      checked={formData.verifiedVin} 
                      onChange={(e) => setFormData({...formData, verifiedVin: e.target.checked})} 
                      className="rounded bg-neutral-50 border-neutral-200 text-[#D4AF37] focus:ring-0 focus:ring-offset-0 cursor-pointer" 
                    />
                    <label htmlFor="verifiedVinCheck" className="text-[10px] text-neutral-700 uppercase tracking-wider font-semibold cursor-pointer">{t('certifyVin')}</label>
                  </div>
                </div>
              </div>

              {/* Section 3: Médias & Galerie */}
              <div>
                <div className="text-[11px] font-bold tracking-widest text-[#D4AF37] uppercase border-b border-neutral-200 pb-2 mb-4">{t('mediaGalleryStep')}</div>
                
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                  {/* Main Image Uploader */}
                  <div className="sm:col-span-1 space-y-1.5">
                    <label className="text-[10px] uppercase tracking-wider text-neutral-600 font-bold flex items-center">{t('mainImage')}<span className="text-red-500 font-bold ml-1">*</span>
                    </label>
                    {mainImageUploading ? (
                      <div className="border border-neutral-200 bg-neutral-50 rounded-xl p-4 flex flex-col items-center justify-center space-y-2 h-32">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#D4AF37]"></div>
                        <div className="text-[9px] text-neutral-500 dark:text-neutral-400">Chargement... {mainImageProgress}%</div>
                        <div className="w-full bg-neutral-200 rounded-full h-1 overflow-hidden">
                          <div className="bg-[#D4AF37] h-1 rounded-full transition-all duration-300" style={{ width: `${mainImageProgress}%` }}></div>
                        </div>
                      </div>
                    ) : formData.image ? (
                      <div className="relative group rounded-xl overflow-hidden border border-neutral-200 bg-neutral-100 h-32 flex items-center justify-center">
                        <img 
                          src={formData.image} 
                          alt="Principale" 
                          className="h-full w-full object-cover transition-transform group-hover:scale-105 duration-300" 
                          onError={(e) => {
                            const fallback = getFallbackSvg(400, 250, 16, 2);
                            if (e.currentTarget.src !== fallback) {
                              e.currentTarget.src = fallback;
                            }
                          }}
                        />
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <button
                            type="button"
                            onClick={() => setFormData({ ...formData, image: '' })}
                            className="bg-red-600 hover:bg-red-500 text-white rounded-full p-2 shadow-lg transition-all hover:scale-110"
                            title={t('deleteImage')}
                          >
                            <Icons.Trash />
                          </button>
                        </div>
                      </div>
                    ) : (
                      <label
                        onDragOver={(e) => { e.preventDefault(); setIsDraggingMain(true); }}
                        onDragLeave={() => setIsDraggingMain(false)}
                        onDrop={(e) => {
                          e.preventDefault();
                          setIsDraggingMain(false);
                          if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                            handleMainImageUpload(e.dataTransfer.files[0]);
                          }
                        }}
                        className={`border border-dashed rounded-xl p-4 flex flex-col items-center justify-center cursor-pointer h-32 transition-all ${
                          formErrors.image
                            ? 'border-red-500/80 bg-red-500/5 hover:border-red-500'
                            : isDraggingMain 
                              ? 'border-[#D4AF37] bg-[#D4AF37]/10' 
                              : 'border-neutral-200 bg-neutral-50 hover:bg-neutral-100/50 hover:border-neutral-300'
                        }`}
                      >
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => {
                            if (e.target.files && e.target.files[0]) {
                              handleMainImageUpload(e.target.files[0]);
                            }
                          }}
                          className="hidden"
                        />
                        <svg className="w-6 h-6 text-neutral-400 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <span className="text-[10px] text-neutral-500 dark:text-neutral-400 text-center">{t('dragOr')}<span className="text-[#D4AF37] underline">{t('browse')}</span></span>
                      </label>
                    )}
                    {formErrors.image && <span className="text-[9px] text-red-500 block">L'image principale est obligatoire.</span>}
                  </div>

                  {/* Gallery Uploader */}
                  <div className="sm:col-span-2 space-y-1.5">
                    <label className="text-[10px] uppercase tracking-wider text-neutral-600 font-bold block">{t('photoGalleryLimit')}</label>
                    
                    <label
                      onDragOver={(e) => { e.preventDefault(); setIsDraggingGallery(true); }}
                      onDragLeave={() => setIsDraggingGallery(false)}
                      onDrop={(e) => {
                        e.preventDefault();
                        setIsDraggingGallery(false);
                        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                          handleGalleryImagesUpload(Array.from(e.dataTransfer.files));
                        }
                      }}
                      className={`border border-dashed rounded-xl p-4 flex flex-col items-center justify-center cursor-pointer h-32 transition-all ${
                        isDraggingGallery ? 'border-[#D4AF37] bg-[#D4AF37]/10' : 'border-neutral-200 bg-neutral-50 hover:bg-neutral-100/50 hover:border-neutral-300'
                      }`}
                    >
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={(e) => {
                          if (e.target.files && e.target.files.length > 0) {
                            handleGalleryImagesUpload(Array.from(e.target.files));
                          }
                        }}
                        className="hidden"
                      />
                      <svg className="w-6 h-6 text-neutral-400 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 13h6m-3-3v6m-9 1V4a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
                      </svg>
                      <span className="text-[10px] text-neutral-500 dark:text-neutral-400 text-center">{t('dragOr')}<span className="text-[#D4AF37] underline">{t('browse')}</span></span>
                      <span className="text-[8px] text-neutral-400 mt-0.5">Photos : {(formData.galleryImages?.length || 0)} / 29</span>
                    </label>
                  </div>
                </div>

                {/* Grid preview of gallery images */}
                {((formData.galleryImages && formData.galleryImages.length > 0) || galleryUploadQueue.length > 0) && (
                  <div className="grid grid-cols-3 sm:grid-cols-6 gap-2.5 mt-3 border border-neutral-200 bg-neutral-50 p-2.5 rounded-xl max-h-48 overflow-y-auto custom-scrollbar">
                    {formData.galleryImages?.map((url, idx) => (
                      <div key={idx} className="relative group aspect-video rounded-lg overflow-hidden bg-neutral-100 border border-neutral-200">
                        <img 
                          src={url} 
                          alt={`Galerie ${idx + 1}`} 
                          className="w-full h-full object-cover transition-transform group-hover:scale-105 duration-300" 
                          onError={(e) => {
                            const fallback = getFallbackSvg(400, 250, 16, 2);
                            if (e.currentTarget.src !== fallback) {
                              e.currentTarget.src = fallback;
                            }
                          }}
                        />
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <button
                            type="button"
                            onClick={() => {
                              const newGallery = formData.galleryImages.filter((_, i) => i !== idx);
                              setFormData({ ...formData, galleryImages: newGallery });
                            }}
                            className="bg-red-600 hover:bg-red-500 text-white rounded-full p-1 shadow-lg transition-all hover:scale-110"
                            title="Supprimer la photo"
                          >
                            <Icons.Trash />
                          </button>
                        </div>
                        <div className="absolute bottom-0.5 left-0.5 bg-black/75 px-1 py-0.2 rounded text-[7px] text-neutral-200">
                          #{idx + 1}
                        </div>
                      </div>
                    ))}

                    {galleryUploadQueue.map((item) => (
                      <div key={item.id} className="relative aspect-video rounded-lg overflow-hidden bg-neutral-100 border border-neutral-200 flex flex-col items-center justify-center p-1 text-center space-y-0.5">
                        {item.status === 'uploading' ? (
                          <>
                            <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-[#D4AF37]"></div>
                            <div className="text-[7px] text-neutral-500 dark:text-neutral-400 truncate w-full">{item.name}</div>
                            <div className="text-[7px] text-neutral-600 font-semibold">{item.progress}%</div>
                            <div className="w-full bg-neutral-200 rounded-full h-0.5 overflow-hidden">
                              <div className="bg-[#D4AF37] h-0.5 rounded-full transition-all duration-300" style={{ width: `${item.progress}%` }}></div>
                            </div>
                          </>
                        ) : item.status === 'error' ? (
                          <>
                            <span className="text-red-500 text-[9px]">⚠️</span>
                            <div className="text-[7px] text-red-500 truncate w-full">{item.name}</div>
                            <span className="text-[7px] text-red-600 font-bold">{t('error')}</span>
                          </>
                        ) : null}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Section 4: Description */}
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase tracking-wider text-neutral-600 font-bold">Description complète</label>
                <textarea 
                  rows="3" 
                  placeholder="Présentation, options spécifiques, historique..." 
                  value={formData.description} 
                  onChange={(e) => setFormData({...formData, description: e.target.value})} 
                  className="w-full bg-neutral-50 border border-neutral-200 focus:border-[#D4AF37] rounded-xl py-2.5 px-4 text-neutral-900 placeholder-neutral-400 focus:outline-none transition-all resize-none"
                ></textarea>
              </div>
              <div className="space-y-1.5 mt-4">
                <label className="text-[10px] uppercase tracking-wider text-neutral-600 font-bold">Description (English)</label>
                <textarea 
                  rows="3" 
                  placeholder="English description..." 
                  value={formData.description_en || ''} 
                  onChange={(e) => setFormData({...formData, description_en: e.target.value})} 
                  className="w-full bg-neutral-50 border border-neutral-200 focus:border-[#D4AF37] rounded-xl py-2.5 px-4 text-neutral-900 placeholder-neutral-400 focus:outline-none transition-all resize-none"
                ></textarea>
              </div>
              <div className="space-y-1.5 mt-4">
                <label className="text-[10px] uppercase tracking-wider text-neutral-600 font-bold">Description (Русский)</label>
                <textarea 
                  rows="3" 
                  placeholder="Русское описание..." 
                  value={formData.description_ru || ''} 
                  onChange={(e) => setFormData({...formData, description_ru: e.target.value})} 
                  className="w-full bg-neutral-50 border border-neutral-200 focus:border-[#D4AF37] rounded-xl py-2.5 px-4 text-neutral-900 placeholder-neutral-400 focus:outline-none transition-all resize-none"
                ></textarea>
              </div>

              <div className="flex gap-4 pt-4 border-t border-neutral-200">
                <button 
                  type="button" 
                  onClick={() => setShowAddEditModal(false)} 
                  className="flex-1 py-3 rounded-xl bg-neutral-100 hover:bg-neutral-200 text-neutral-700 font-bold transition-all border border-neutral-200"
                >{t('cancel')}</button>
                <button 
                  type="submit" 
                  disabled={mainImageUploading || galleryUploading}
                  className={`flex-1 py-3 rounded-xl font-bold transition-all shadow-lg active:scale-[0.99] ${
                    mainImageUploading || galleryUploading 
                      ? 'bg-neutral-300 text-neutral-500 cursor-not-allowed' 
                      : 'bg-[#D4AF37] hover:bg-[#D4AF37]/90 text-neutral-950'
                  }`}
                >
                  {mainImageUploading || galleryUploading ? 'Загрузка изображения на сервера...' : 'Sauvegarder'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}


      {}

      {/* Кастомное модальное окно удаления машины (заменяет confirm) */}
      {deleteConfirmCar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-md bg-white dark:bg-[#121214] border border-neutral-200 dark:border-neutral-900 rounded-2xl p-6 shadow-2xl space-y-6">
            <div className="text-center">
              <h4 className="text-xl font-serif text-neutral-900 dark:text-white mb-2">{t('confirmDeletion')}</h4>
              <p className="text-neutral-600 dark:text-neutral-400 dark:text-neutral-400 text-sm">{t('deleteConfirmAdmin')}<span className="text-[#D4AF37] font-semibold">{deleteConfirmCar.brand} {deleteConfirmCar.model}</span>{t('deleteWarning')}</p>
            </div>
            <div className="flex gap-4">
              <button 
                onClick={() => setDeleteConfirmCar(null)}
                className="flex-1 py-3 rounded-xl bg-neutral-100 dark:bg-[#0D0D0D] hover:bg-neutral-200 dark:hover:bg-neutral-800 text-neutral-800 dark:text-neutral-300 font-bold border border-neutral-200 dark:border-neutral-800 transition-all"
              >{t('cancel')}</button>
              <button 
                onClick={handleDeleteCar}
                className="flex-1 py-3 rounded-xl bg-red-650 hover:bg-red-600 text-white font-bold transition-all shadow-lg shadow-red-650/10"
              >
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lightbox / Полноэкранный просмотр фотографий */}
      {showLightbox && currentCarGallery.length > 0 && (
        <div className="fixed inset-0 z-[100] bg-white/95 dark:bg-black/95 backdrop-blur-md flex flex-col items-center justify-center p-4 select-none animate-fadeIn text-neutral-900 dark:text-white">
          {/* Close button top right */}
          <button 
            onClick={() => setShowLightbox(false)}
            className="absolute top-6 right-6 p-3 rounded-full bg-white dark:bg-[#121214] hover:bg-[#D4AF37] border border-neutral-200 dark:border-neutral-900 hover:border-neutral-300 dark:hover:border-neutral-800 text-neutral-700 dark:text-neutral-300 hover:text-neutral-950 shadow-lg shadow-neutral-200/50 dark:shadow-black/50 transition-all z-[110]"
            title={t('closeEscape')}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>

          {/* Large image view */}
          <div className="relative max-w-5xl max-h-[75vh] w-full flex items-center justify-center">
            {/* Left navigation arrow */}
            <button 
              onClick={() => {
                setLightboxIndex(prev => (prev === 0 ? currentCarGallery.length - 1 : prev - 1));
              }}
              className="absolute left-0 sm:left-4 p-3 rounded-full bg-white dark:bg-[#121214] hover:bg-[#D4AF37] border border-neutral-200 dark:border-neutral-900 hover:border-neutral-300 dark:hover:border-neutral-800 text-neutral-700 dark:text-neutral-300 hover:text-neutral-950 shadow-lg shadow-neutral-200/50 dark:shadow-black/50 transition-all z-[110]"
              title={t('prevImage')}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
            </button>

            <img 
              src={currentCarGallery[lightboxIndex]} 
              alt={`${selectedCar.brand} ${selectedCar.model} - ${lightboxIndex + 1}`}
              className="max-w-full max-h-[75vh] object-contain rounded-lg shadow-2xl select-none"
              onError={(e) => {
                const fallback = getFallbackSvg(1200, 800, 32, 4);
                if (e.currentTarget.src !== fallback) {
                  e.currentTarget.src = fallback;
                }
              }}
            />

            {/* Right navigation arrow */}
            <button 
              onClick={() => {
                setLightboxIndex(prev => (prev === currentCarGallery.length - 1 ? 0 : prev + 1));
              }}
              className="absolute right-0 sm:right-4 p-3 rounded-full bg-white dark:bg-[#121214] hover:bg-[#D4AF37] border border-neutral-200 dark:border-neutral-900 hover:border-neutral-300 dark:hover:border-neutral-800 text-neutral-700 dark:text-neutral-300 hover:text-neutral-950 shadow-lg shadow-neutral-200/50 dark:shadow-black/50 transition-all z-[110]"
              title={t('nextImage')}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
            </button>
          </div>

          {/* Image index and navigation guide */}
          <div className="mt-4 text-xs text-neutral-800 dark:text-neutral-300 font-semibold tracking-wider flex flex-col items-center gap-1">
            <span>{lightboxIndex + 1} / {currentCarGallery.length}</span>
            <span className="text-[10px] text-neutral-500 dark:text-neutral-400 uppercase font-light">{t('navHelp')}</span>
          </div>

          {/* Thumbnails strip at the bottom of the lightbox */}
          <div className="flex gap-2 mt-4 max-w-full overflow-x-auto p-2 scrollbar-thin scrollbar-thumb-neutral-300 dark:scrollbar-thumb-neutral-800">
            {currentCarGallery.map((img, idx) => (
              <button 
                key={idx}
                onClick={() => setLightboxIndex(idx)}
                className={`relative w-16 h-12 rounded overflow-hidden border transition-all flex-shrink-0 ${
                  lightboxIndex === idx ? 'border-[#D4AF37] ring-2 ring-[#D4AF37]/20 scale-105' : 'border-neutral-200 dark:border-neutral-900 opacity-60 hover:opacity-100 hover:border-neutral-300 dark:hover:border-neutral-800'
                }`}
              >
                <img 
                  src={img} 
                  className="w-full h-full object-cover" 
                  onError={(e) => {
                    const fallback = getFallbackSvg(400, 250, 16, 2);
                    if (e.currentTarget.src !== fallback) {
                      e.currentTarget.src = fallback;
                    }
                  }}
                />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}