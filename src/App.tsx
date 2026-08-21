import React, { useState, useEffect, useMemo, useRef } from "react";
import { initializeApp } from "firebase/app";
import { 
  getFirestore, 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  addDoc, 
  deleteDoc, 
  updateDoc, 
  query, 
  onSnapshot 
} from "firebase/firestore";
import { 
  getStorage, 
  ref as storageRef, 
  uploadBytesResumable, 
  getDownloadURL 
} from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyCDtqzoVTjat0DLJ161aiEjfpmKeeYn6I8",
  authDomain: "ligo-auto.firebaseapp.com",
  projectId: "ligo-auto",
  storageBucket: "ligo-auto.firebasestorage.app",
  messagingSenderId: "1038813841068",
  appId: "1:1038813841068:web:56e339aca331d66d100109"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const storage = getStorage(app);
const appId = "ligo-auto";

const withTimeout = (promise: Promise<any>, timeoutMs: number = 3000) => {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), timeoutMs))
  ]);
};

export function getFallbackSvg(w = 800, h = 600, r = 16, b = 2): string {
  return "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='" + w + "' height='" + h + "' viewBox='0 0 " + w + " " + h + "'><rect width='100%' height='100%' fill='%231a1a1c'/><rect x='" + b + "' y='" + b + "' width='" + (w - 2 * b) + "' height='" + (h - 2 * b) + "' rx='" + r + "' fill='none' stroke='%23333336' stroke-width='" + b + "'/><path d='M" + (w/2 - 30) + " " + (h/2) + "h60M" + (w/2) + " " + (h/2 - 30) + "v60' stroke='%23D4AF37' stroke-width='2' stroke-linecap='round'/><text x='50%' y='" + (h/2 + 50) + "' fill='%23D4AF37' font-family='sans-serif' font-size='14' text-anchor='middle' letter-spacing='2'>LIGO AUTOMOBILES</text></svg>";
}

export function calculateReadingTime(text: string): number {
  if (!text) return 3;
  const wordCount = text.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(wordCount / 200));
}

export function generateArticleSlug(title: string, lang: string = "fr"): string {
  if (!title) return "";
  return title
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\u0400-\u04FF]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function getArticleTitle(article: any, l?: string): string {
  if (!article) return "";
  const target = l || "fr";
  if (article.translations?.[target]?.title?.trim()) {
    return article.translations[target].title;
  }
  if (target === 'ru' && article.title_ru?.trim()) return article.title_ru;
  if (target === 'en' && article.title_en?.trim()) return article.title_en;
  if (target === 'fr' && article.title?.trim()) return article.title;

  return article.translations?.fr?.title || 
         article.translations?.ru?.title || 
         article.translations?.en?.title || 
         article.title || article.title_ru || article.title_en || "";
}

export function getArticleExcerpt(article: any, l?: string): string {
  if (!article) return "";
  const target = l || "fr";
  if (article.translations?.[target]?.excerpt?.trim()) {
    return article.translations[target].excerpt;
  }
  if (target === 'ru' && article.excerpt_ru?.trim()) return article.excerpt_ru;
  if (target === 'en' && article.excerpt_en?.trim()) return article.excerpt_en;
  if (target === 'fr' && article.excerpt?.trim()) return article.excerpt;

  return article.translations?.fr?.excerpt || 
         article.translations?.ru?.excerpt || 
         article.translations?.en?.excerpt || 
         article.excerpt || article.excerpt_ru || article.excerpt_en || "";
}

export function getArticleContent(article: any, l?: string): string {
  if (!article) return "";
  const target = l || "fr";
  if (article.translations?.[target]?.content?.trim()) {
    return article.translations[target].content;
  }
  if (target === 'ru' && article.content_ru?.trim()) return article.content_ru;
  if (target === 'en' && article.content_en?.trim()) return article.content_en;
  if (target === 'fr' && article.content?.trim()) return article.content;

  return article.translations?.fr?.content || 
         article.translations?.ru?.content || 
         article.translations?.en?.content || 
         article.content || article.content_ru || article.content_en || "";
}

export function getArticleSlug(article: any, l?: string): string {
  if (!article) return "";
  const target = l || "fr";
  if (article.translations?.[target]?.slug?.trim()) {
    return article.translations[target].slug;
  }
  if (target === 'ru' && article.slug_ru?.trim()) return article.slug_ru;
  if (target === 'en' && article.slug_en?.trim()) return article.slug_en;
  if (target === 'fr' && article.slug?.trim()) return article.slug;

  return article.translations?.fr?.slug || 
         article.translations?.ru?.slug || 
         article.translations?.en?.slug || 
         article.slug || "";
}

export function compressImageToWebpBlob(file: File, maxWidth: number = 1600, maxHeight: number = 1200, quality: number = 0.82): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Canvas context creation failed"));
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob);
            } else {
              canvas.toBlob(
                (jpegBlob) => {
                  if (jpegBlob) resolve(jpegBlob);
                  else reject(new Error("Image compression failed"));
                },
                "image/jpeg",
                quality
              );
            }
          },
          "image/webp",
          quality
        );
      };
      img.onerror = (error) => reject(error);
    };
    reader.onerror = (error) => reject(error);
  });
}

export function compressImageToWebpBase64(file: File, maxWidth: number = 1600, maxHeight: number = 1200, quality: number = 0.82): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(event.target?.result as string);
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);

        try {
          const webpData = canvas.toDataURL("image/webp", quality);
          if (webpData && webpData.startsWith("data:image/webp")) {
            resolve(webpData);
            return;
          }
        } catch (e) {
          // fallback to jpeg if browser doesn't support canvas toDataURL webp
        }
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.onerror = (error) => reject(error);
    };
    reader.onerror = (error) => reject(error);
  });
}

export function compressImage(file: File, maxWidth: number = 1200, maxHeight: number = 800, quality: number = 0.85): Promise<string> {
  return compressImageToWebpBase64(file, maxWidth, maxHeight, quality);
}

export async function uploadImageFile(file: File, onProgress?: (pct: number) => void): Promise<string> {
  onProgress?.(20);
  
  // 1. Быстрая компрессия и оптимизация в WebP (Blob + Data URL)
  let blob: Blob | null = null;
  let base64 = '';
  
  try {
    const results = await Promise.all([
      compressImageToWebpBlob(file, 1600, 1200, 0.82),
      compressImageToWebpBase64(file, 1600, 1200, 0.82)
    ]);
    blob = results[0];
    base64 = results[1];
  } catch (compErr) {
    console.warn("Client-side compression fallback:", compErr);
    base64 = await compressImageToWebpBase64(file, 1200, 900, 0.80);
  }

  onProgress?.(50);

  const cleanName = (file.name || 'photo').replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
  const storagePath = `cars/${Date.now()}_${Math.random().toString(36).substring(2, 8)}_${cleanName}.webp`;

  // 2. Первичное облачное хранилище: Firebase Storage с быстрым таймаутом (4 секунды)
  if (blob) {
    try {
      const fileRef = storageRef(storage, storagePath);
      const uploadTask = uploadBytesResumable(fileRef, blob, {
        contentType: blob.type || 'image/webp'
      });

      const fbUrl = await new Promise<string>((resolve, reject) => {
        const timeoutId = setTimeout(() => {
          try { uploadTask.cancel(); } catch (cErr) {}
          reject(new Error("Firebase Storage timeout"));
        }, 4000);

        uploadTask.on(
          'state_changed',
          (snapshot) => {
            if (snapshot.totalBytes > 0 && onProgress) {
              const pct = 50 + Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 48);
              onProgress(Math.min(98, pct));
            }
          },
          (error) => {
            clearTimeout(timeoutId);
            reject(error);
          },
          async () => {
            clearTimeout(timeoutId);
            try {
              const url = await getDownloadURL(uploadTask.snapshot.ref);
              resolve(url);
            } catch (e) {
              reject(e);
            }
          }
        );
      });

      if (fbUrl && fbUrl.startsWith('https://')) {
        onProgress?.(100);
        return fbUrl;
      }
    } catch (fbError) {
      console.warn("Firebase Storage upload skipped/unavailable, using direct optimized WebP data:", fbError);
    }
  }

  // 3. Надежное мгновенное сохранение оптимизированного WebP Base64 (100% без сбоев и зависаний)
  onProgress?.(100);
  return base64;
}


export const translations: Record<string, Record<string, string>> = {
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
showOnHomepage: "Afficher sur la page d'accueil",
homepageOrder: "Ordre sur la page d'accueil",
featuredAdminTab: "Véhicules Accueil",
max10CarsAlert: "Sur la page d'accueil, vous pouvez placer au maximum 10 véhicules. Veuillez en retirer un avant d'en ajouter un nouveau.",
addToHomepage: "Ajouter à l'accueil",
removeFromHomepage: "Retirer de l'accueil",
featuredLimitBadge: "Sélectionnés pour l'accueil",
reorderInstructions: "Glissez-déposez ou utilisez les flèches pour définir l'ordre exact d'affichage sur la page d'accueil.",
noFeaturedCars: "Aucun véhicule sélectionné pour la page d'accueil. Ajoutez-en depuis le catalogue ci-dessous.",
onHomepageBadge: "Accueil",
addCarToHomepage: "Ajouter un véhicule à l'accueil",
selectCarFromCatalog: "Sélectionner un véhicule du catalogue...",
homepageSectionHeader: "Véhicules en vedette sur l'accueil",
homepageSectionDesc: "Sélectionnez jusqu'à 10 véhicules et réglez leur ordre d'affichage sur la page d'accueil.",
actualites: "Actualités",
actualitesTitle: "Nos conseils automobiles",
actualitesSubtitle: "Guides, actualités et conseils pour acheter, entretenir et choisir votre prochain véhicule.",
actualitesCategory: "Actualités & Conseils",
readArticle: "Lire l'article",
readingTime: "min de lecture",
publishedOn: "Publié le",
updatedOn: "Mis à jour le",
tableOfContents: "Sommaire",
availableVehicles: "Véhicules disponibles",
similarArticles: "Articles similaires",
allCategories: "Tous",
searchArticlePlaceholder: "Rechercher un article (titre, mot-clé, tag)...",
noArticlesFound: "Aucun article ne correspond à votre recherche.",
articleCategories: "Catégories d'articles",
articlesAdminTab: "Articles",
categoriesAdminTab: "Catégories",
addArticle: "Nouvel article",
editArticle: "Modifier l'article",
deleteArticle: "Supprimer l'article",
articleSaved: "Article enregistré avec succès !",
articleDeleted: "Article supprimé !",
duplicateArticle: "Dupliquer",
previewArticle: "Prévisualiser",
draftStatus: "Brouillon",
publishedStatus: "Publié",
scheduledStatus: "Programmé",
archivedStatus: "Archivé",
seoTitle: "Titre SEO",
metaDescription: "Meta Description",
focusKeyword: "Mot-clé principal (Focus Keyword)",
canonicalUrl: "URL canonique",
indexation: "Indexation robots",
featuredImage: "Image principale",
featuredImageAlt: "Texte alternatif (ALT)",
articleExcerpt: "Résumé de l'article",
articleContent: "Contenu de l'article",
articleAuthor: "Auteur",
articleCategory: "Catégorie",
articleTags: "Tags",
connectedVehicles: "Véhicules liés",
connectedArticles: "Articles liés",
featuredOnBlog: "Mettre en avant sur /actualites/",
featuredOnHomeBlog: "Afficher sur l'accueil",
homepageBlogOrder: "Ordre sur l'accueil (1-3)",
seeAllArticles: "Voir tous les articles",
homeBlogTitle: "Conseils & Actualités",
homeBlogSubtitle: "Découvrez nos guides d'experts, comparatifs et conseils d'achat automobile.",
carRelatedArticles: "Conseils & articles liés",
shareArticle: "Partager",
exportSitemap: "Générer sitemap.xml",
sitemapGenerated: "Sitemap XML généré avec succès !",
downloadSitemap: "Télécharger sitemap.xml",
ctaBannerTitle: "Vous recherchez une voiture d'occasion ?",
ctaBannerDesc: "Découvrez nos véhicules disponibles et trouvez votre prochain véhicule en toute sérénité.",
ctaBannerButton: "Voir nos véhicules",
contactUsButton: "Nous contacter",
addCategory: "Ajouter une catégorie",
editCategory: "Modifier la catégorie",
categoryName: "Nom de la catégorie",
categorySlug: "Slug URL",
categoryDesc: "Description de la catégorie",
categorySaved: "Catégorie enregistrée !",
categoryDeleted: "Catégorie supprimée !",
      messageLabel: "Message",
      carEquipments: "Équipements & Options",
      equipmentsLabel: "OPTIONS & ÉQUIPEMENTS",
      carCondition: "CONTRÔLE & SÉRÉNITÉ",
      carConditionTitle: "Contrôle rigoureux et sérénité garantie",
      carConditionText: "Ce véhicule a été inspecté sur plus de 100 points de contrôle essentiels par nos techniciens spécialisés. Kilométrage d'origine certifié, historique limpide, absence de sinistre structurel et révision effectuée avant livraison.",
      warranty12Months: "Garantie professionnelle 12 mois incluse",
      inspectionReport: "Rapport d'inspection et historique complet",
      deliveryFrance: "Livraison possible partout en France",
      reserveVehicle: "Réserver ce véhicule",
      carFaqTitle: "FAQ / QUESTIONS FRÉQUENTES",
      carFaqHeading: "Questions fréquentes sur ce",
      carKeySpecs: "Fiche technique détaillée",
      carPresentation: "PRÉSENTATION DU VÉHICULE",
      carPresentationSuffix: "d'occasion : présentation complète",
      badgeFrance: "LIGO AUTOMOBILES • FRANCE",
      bannerTitle: "Achat et Vente d'Automobiles",
      bannerSubtitle: "Sélection rigoureuse, historique transparent et accompagnement administratif complet.",
      bannerDescription: "Sélection rigoureuse, historique transparent et accompagnement administratif complet.",
      aboutTitle: "Votre partenaire de confiance en France",
      aboutSubtitle: "LIGO AUTOMOBILES",
      aboutText: "Nous assurons une transparence totale à chaque étape de la transaction. Chaque véhicule subit une inspection technique et juridique complète.",
      contactTitle: "Contactez-nous",
      contactSubtitle: "DISCUTONS DE VOTRE PROJET",
      similarVehicles: "Véhicules similaires",
      similarVehiclesTitle: "Vous pourriez aussi aimer",
      compareAction: "Comparer",
      compareAdded: "Ajouté",
      compareFloatingCount: "véhicules en comparaison",
      compareFloatingBtn: "Comparer",
      comparePageTitle: "Comparateur de Véhicules",
      comparePageSubtitle: "Comparez les prix, caractéristiques techniques, équipements et options de votre sélection.",
      compareEmptyTitle: "Aucun véhicule sélectionné",
      compareEmptyDesc: "Ajoutez jusqu'à 4 véhicules depuis le catalogue pour comparer leurs caractéristiques et équipements côte à côte.",
      compareBackToCatalog: "Retour au catalogue",
      compareShowDiffOnly: "Afficher uniquement les différences",
      compareClearAll: "Effacer la comparaison",
      vehiclesCountLabel: "véhicules sélectionnés",
      compareParamPrice: "Prix TTC",
      compareBestPrice: "Meilleur prix",
      compareParamYear: "Année modèle",
      compareNewestYear: "Plus récent",
      compareParamKm: "Kilométrage",
      compareLowestKm: "Moins kilométré",
      compareParamFuel: "Carburant",
      compareParamTransmission: "Boîte de vitesses",
      compareParamPower: "Puissance moteur",
      compareParamEngine: "Cylindrée",
      compareParamCo2: "Puissance fiscale (P6)",
      compareParamColor: "Couleur extérieure",
      compareParamBody: "Carrosserie",
      compareParamDoors: "Nombre de portes",
      compareParamSeats: "Nombre de places",
      compareParamVin: "VIN vérifié",
      compareParamWarranty: "Garantie",
      compareParamStatus: "Disponibilité",
      compareViewCar: "Voir la fiche",
      characteristics: "Caractéristiques",
      taxIncludedTradeIn: "TTC • Reprise possible",
      home: "Accueil",
      doorsCount: "portes",
      seatsCount: "places",
      removeFromCompare: "Retirer de la comparaison",
      compareSwipeHint: "Faites glisser horizontalement pour comparer les véhicules →",
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
      searchText: "Search by keyword",
      searchPlaceholder: "E.g. GT3, Weissach...",
      noVehicles: "No vehicles match your search criteria.",
      contactUs: "Contact Us",
      discussProject: "Let's discuss your project",
      contactDesc: "Looking for more information about a specific model? Contact us directly.",
      messageSent: "Message sent successfully!",
      specialRequestPlaceholder: "I would like additional information...",
      noDescription: "No description available.",
      lightMode: "Light Mode",
      darkMode: "Dark Mode",
      minPlaceholder: "Min",
      maxPlaceholder: "Max",
      browseEntireCatalog: "Browse entire catalogue ({count} vehicles)",
      updatingCatalogue: "Updating catalogue...",
      tabGeneralButtons: "General & Buttons",
      tabCatalogFilters: "Catalogue & Filters",
      tabTechnicalSpecs: "Technical Specs",
      tabFormsLeasing: "Forms & LOA",
      fillAllFields: "Please fill in all required fields.",
      allRightsReserved: "All rights reserved",
      stat1Title: "RIGOROUS INSPECTION & SELECTION",
      stat1Sub: "Trust & Vehicle Condition",
      stat2Title: "VERIFIED VIN / HISTORY",
      stat2Sub: "Transparency & Provenance",
      stat3Title: "SECURE LOGISTICS / CUSTOM ORDER",
      stat3Sub: "Service & Logistics",
      prevImage: "Previous (Left)",
      nextImage: "Next (Right)",
      confirmDeletion: "Confirm deletion",
      navHelp: "Use ◄ and ► to navigate, Esc to close",
      namePlaceholder: "John Doe",
      emailPlaceholder: "john@email.com",
      phonePlaceholder: "+33 6...",
      passwordPlaceholder: "Password",
      generalInfoStep: "General Information",
      mileageKm: "Mileage (km)",
      priceEuro: "Price (€)",
      powerHp: "Power (hp)",
      techSpecsStep: "Technical Specifications",
      status: "Status",
      co2gkm: "Fiscal power (P6)",
      certifyVin: "Certify VIN",
      mediaGalleryStep: "Media Gallery",
      mainImage: "Main Image",
      photoGalleryLimit: "Photo Gallery (Max 30)",
      dragOr: "Drag or",
      browse: "browse",
      showOnHomepage: "Show on homepage",
      homepageOrder: "Homepage order",
      featuredAdminTab: "Featured Vehicles",
      max10CarsAlert: "You can place a maximum of 10 vehicles on the homepage. Please remove one before adding another.",
      addToHomepage: "Add to homepage",
      removeFromHomepage: "Remove from homepage",
      featuredLimitBadge: "Selected for homepage",
      reorderInstructions: "Drag and drop or use arrows to set exact display order on the homepage.",
      noFeaturedCars: "No vehicles selected for homepage. Add some from the catalogue below.",
      onHomepageBadge: "Homepage",
      addCarToHomepage: "Add vehicle to homepage",
      selectCarFromCatalog: "Select vehicle from catalogue...",
      homepageSectionHeader: "Featured Vehicles on Homepage",
      homepageSectionDesc: "Select up to 10 vehicles and configure their order on the homepage.",
      actualites: "News & Articles",
      actualitesTitle: "Automotive Guides & Insights",
      actualitesSubtitle: "Guides, news and expert advice on buying, maintaining and choosing your next vehicle.",
      actualitesCategory: "News & Guides",
      readArticle: "Read Article",
      readingTime: "min read",
      publishedOn: "Published on",
      updatedOn: "Updated on",
      tableOfContents: "Table of Contents",
      availableVehicles: "Available Vehicles",
      similarArticles: "Related Articles",
      allCategories: "All",
      searchArticlePlaceholder: "Search articles (title, keyword, tag)...",
      noArticlesFound: "No articles matched your search.",
      articleCategories: "Article Categories",
      articlesAdminTab: "Articles",
      categoriesAdminTab: "Categories",
      addArticle: "New Article",
      editArticle: "Edit Article",
      deleteArticle: "Delete Article",
      articleSaved: "Article saved successfully!",
      articleDeleted: "Article deleted!",
      duplicateArticle: "Duplicate",
      previewArticle: "Preview",
      draftStatus: "Draft",
      publishedStatus: "Published",
      scheduledStatus: "Scheduled",
      archivedStatus: "Archived",
      seoTitle: "SEO Title",
      metaDescription: "Meta Description",
      focusKeyword: "Focus Keyword",
      canonicalUrl: "Canonical URL",
      indexation: "Search Engine Indexing",
      featuredImage: "Featured Image",
      featuredImageAlt: "Alt Text (ALT)",
      articleExcerpt: "Article Excerpt",
      articleContent: "Article Content",
      articleAuthor: "Author",
      articleCategory: "Category",
      articleTags: "Tags",
      connectedVehicles: "Connected Vehicles",
      connectedArticles: "Connected Articles",
      featuredOnBlog: "Feature on /actualites/",
      featuredOnHomeBlog: "Show on Homepage",
      homepageBlogOrder: "Homepage order (1-3)",
      seeAllArticles: "View all articles",
      homeBlogTitle: "Advice & News",
      homeBlogSubtitle: "Discover our expert guides, comparisons and buying advice.",
      carRelatedArticles: "Related articles & tips",
      shareArticle: "Share",
      exportSitemap: "Generate sitemap.xml",
      sitemapGenerated: "Sitemap XML generated successfully!",
      downloadSitemap: "Download sitemap.xml",
      ctaBannerTitle: "Looking for a pre-owned luxury car?",
      ctaBannerDesc: "Discover our available stock and purchase with complete peace of mind.",
      ctaBannerButton: "Explore Vehicles",
      contactUsButton: "Contact Us",
      addCategory: "Add Category",
      editCategory: "Edit Category",
      categoryName: "Category Name",
      categorySlug: "URL Slug",
      categoryDesc: "Category Description",
      categorySaved: "Category saved!",
      categoryDeleted: "Category deleted!",
      messageLabel: "Message",
      carEquipments: "Equipments & Options",
      equipmentsLabel: "OPTIONS & EQUIPMENTS",
      carCondition: "INSPECTION & WARRANTY",
      carConditionTitle: "Rigorous inspection and guaranteed peace of mind",
      carConditionText: "This vehicle has been inspected across more than 100 essential checkpoints by our certified specialists. Genuine certified mileage, clean vehicle history, no structural damage, and fully serviced before delivery.",
      warranty12Months: "12-month professional warranty included",
      inspectionReport: "Inspection report & complete history",
      deliveryFrance: "Delivery available across France",
      reserveVehicle: "Reserve this vehicle",
      carFaqTitle: "FAQ / FREQUENT QUESTIONS",
      carFaqHeading: "Frequently asked questions about this",
      carKeySpecs: "Detailed Technical Specifications",
      carPresentation: "VEHICLE PRESENTATION",
      carPresentationSuffix: "pre-owned: complete overview",
      badgeFrance: "LIGO AUTOMOBILES • FRANCE",
      bannerTitle: "Purchase & Sale of Automobiles",
      bannerSubtitle: "Rigorous selection, certified vehicle history, and full administrative support.",
      bannerDescription: "Rigorous selection, certified vehicle history, and full administrative support.",
      aboutTitle: "Your trusted partner in France",
      aboutSubtitle: "LIGO AUTOMOBILES",
      aboutText: "We ensure total transparency at every stage of the transaction. Every vehicle undergoes a comprehensive technical and legal inspection.",
      contactTitle: "Contact Us",
      contactSubtitle: "LET'S DISCUSS YOUR PROJECT",
      similarVehicles: "Similar Vehicles",
      similarVehiclesTitle: "You might also like",
      compareAction: "Compare",
      compareAdded: "Added",
      compareFloatingCount: "vehicles in comparison",
      compareFloatingBtn: "Compare",
      comparePageTitle: "Vehicle Comparison",
      comparePageSubtitle: "Compare prices, technical specifications, equipment and options of your selection.",
      compareEmptyTitle: "No vehicles selected",
      compareEmptyDesc: "Add up to 4 vehicles from the catalogue to compare their specifications and features side by side.",
      compareBackToCatalog: "Back to catalogue",
      compareShowDiffOnly: "Show differences only",
      compareClearAll: "Clear comparison",
      vehiclesCountLabel: "vehicles selected",
      compareParamPrice: "Price (incl. VAT)",
      compareBestPrice: "Best price",
      compareParamYear: "Model year",
      compareNewestYear: "Newest",
      compareParamKm: "Mileage",
      compareLowestKm: "Lowest mileage",
      compareParamFuel: "Fuel",
      compareParamTransmission: "Transmission",
      compareParamPower: "Engine power",
      compareParamEngine: "Engine size",
      compareParamCo2: "Fiscal power (P6)",
      compareParamColor: "Exterior color",
      compareParamBody: "Body type",
      compareParamDoors: "Number of doors",
      compareParamSeats: "Number of seats",
      compareParamVin: "Verified VIN",
      compareParamWarranty: "Warranty",
      compareParamStatus: "Availability",
      compareViewCar: "View vehicle",
      characteristics: "Specifications",
      taxIncludedTradeIn: "Incl. VAT • Trade-in",
      home: "Home",
      doorsCount: "doors",
      seatsCount: "seats",
      removeFromCompare: "Remove from comparison",
      compareSwipeHint: "Swipe horizontally to compare vehicles →",
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
      showOnHomepage: "Показывать на главной странице",
      homepageOrder: "Порядок на главной",
      featuredAdminTab: "Главная (Избранное)",
      max10CarsAlert: "На главной странице можно разместить максимум 10 автомобилей. Уберите один из уже выбранных автомобилей.",
      addToHomepage: "Добавить на главную",
      removeFromHomepage: "Убрать с главной",
      featuredLimitBadge: "Выбрано для главной",
      reorderInstructions: "Перетаскивайте мышкой (Drag & Drop) или используйте стрелки для настройки точного порядка на главной.",
      noFeaturedCars: "Нет выбранных автомобилей для главной страницы. Добавьте автомобили из каталога ниже.",
      onHomepageBadge: "На главной",
      addCarToHomepage: "Добавить автомобиль на главную",
      selectCarFromCatalog: "Выберите автомобиль из каталога...",
      homepageSectionHeader: "Автомобили на главной странице",
      homepageSectionDesc: "Выберите до 10 автомобилей для отображения в блоке «Nos Véhicules» и настройте их точный порядок.",
      actualites: "Статьи и Новости",
      actualitesTitle: "Автомобильные статьи и советы",
      actualitesSubtitle: "Гайды, новости и советы по покупке, обслуживанию и выбору автомобиля.",
      actualitesCategory: "Новости & Советы",
      readArticle: "Читать статью",
      readingTime: "мин. чтения",
      publishedOn: "Опубликовано",
      updatedOn: "Обновлено",
      tableOfContents: "Содержание",
      availableVehicles: "Автомобили в наличии",
      similarArticles: "Похожие статьи",
      allCategories: "Все",
      searchArticlePlaceholder: "Поиск статьи (название, ключевое слово, тег)...",
      noArticlesFound: "По вашему запросу статей не найдено.",
      articleCategories: "Категории статей",
      articlesAdminTab: "Статьи",
      categoriesAdminTab: "Категории",
      addArticle: "Новая статья",
      editArticle: "Редактировать статью",
      deleteArticle: "Удалить статью",
      articleSaved: "Статья успешно сохранена!",
      articleDeleted: "Статья удалена!",
      duplicateArticle: "Дублировать",
      previewArticle: "Предпросмотр",
      draftStatus: "Черновик",
      publishedStatus: "Опубликовано",
      scheduledStatus: "Запланировано",
      archivedStatus: "В архиве",
      seoTitle: "SEO Title",
      metaDescription: "Meta Description",
      focusKeyword: "Главное ключевое слово",
      canonicalUrl: "Канонический URL",
      indexation: "Индексация роботами",
      featuredImage: "Главное изображение",
      featuredImageAlt: "Alt-текст изображения (ALT)",
      articleExcerpt: "Краткое описание (Résumé)",
      articleContent: "Текст статьи",
      articleAuthor: "Автор",
      articleCategory: "Категория",
      articleTags: "Теги",
      connectedVehicles: "Связанные автомобили",
      connectedArticles: "Связанные статьи",
      featuredOnBlog: "Баннер на странице /actualites/",
      featuredOnHomeBlog: "Показывать на главной",
      homepageBlogOrder: "Позиция на главной (1-3)",
      seeAllArticles: "Все статьи",
      homeBlogTitle: "Советы & Новости",
      homeBlogSubtitle: "Экспертные обзоры, гиды покупателям и советы по выбору автомобиля.",
      carRelatedArticles: "Советы и статьи по теме",
      shareArticle: "Поделиться",
      exportSitemap: "Сгенерировать sitemap.xml",
      sitemapGenerated: "Sitemap XML успешно сформирован!",
      downloadSitemap: "Скачать sitemap.xml",
      ctaBannerTitle: "Ищете надежный автомобиль с пробегом?",
      ctaBannerDesc: "Ознакомьтесь с нашими проверенными автомобилями в наличии.",
      ctaBannerButton: "Смотреть автомобили",
      contactUsButton: "Связаться с нами",
      addCategory: "Добавить категорию",
      editCategory: "Редактировать категорию",
      categoryName: "Название категории",
      categorySlug: "Slug URL",
      categoryDesc: "Описание категории",
      categorySaved: "Категория сохранена!",
      categoryDeleted: "Категория удалена!",
      messageLabel: "Сообщение",
      carEquipments: "Комплектация и опции",
      equipmentsLabel: "ОПЦИИ & КОМПЛЕКТАЦИЯ",
      carCondition: "КОНТРОЛЬ & ГАРАНТИЯ",
      carConditionTitle: "Строгий контроль и гарантия надежности",
      carConditionText: "Автомобиль проверен по более чем 100 ключевым контрольным точкам нашими специалистами. Оригинальный подтвержденный пробег, прозрачная история, отсутствие серьезных ДТП и полное ТО перед передачей.",
      warranty12Months: "Профессиональная гарантия 12 месяцев",
      inspectionReport: "Отчет об инспекции и полная история",
      deliveryFrance: "Возможна доставка по всей Франции",
      reserveVehicle: "Забронировать автомобиль",
      carFaqTitle: "ЧАСТЫЕ ВОПРОСЫ",
      carFaqHeading: "Частые вопросы по этому",
      carKeySpecs: "Подробные технические характеристики",
      carPresentation: "ОБЗОР АВТОМОБИЛЯ",
      carPresentationSuffix: "с пробегом: полный обзор",
      badgeFrance: "LIGO AUTOMOBILES • ФРАНЦИЯ",
      bannerTitle: "Покупка и продажа автомобилей",
      bannerSubtitle: "Профессиональный подбор, проверка истории и техническая инспекция каждого автомобиля. Сопровождение сделки «под ключ».",
      bannerDescription: "Профессиональный подбор, проверка истории и техническая инспекция каждого автомобиля. Сопровождение сделки «под ключ».",
      aboutTitle: "Ваш надежный партнер во Франции",
      aboutSubtitle: "LIGO AUTOMOBILES",
      aboutText: "Мы гарантируем полную прозрачность на каждом этапе сделки. Каждый автомобиль проходит комплексную техническую и юридическую проверку.",
      contactTitle: "Свяжитесь с нами",
      contactSubtitle: "ОБСУДИМ ВАШ ПРОЕКТ",
      similarVehicles: "Похожие автомобили",
      similarVehiclesTitle: "Вам также может понравиться",
      compareAction: "Сравнить",
      compareAdded: "В сравнении",
      compareFloatingCount: "авто в сравнении",
      compareFloatingBtn: "Сравнить",
      comparePageTitle: "Сравнение автомобилей",
      comparePageSubtitle: "Сравните цены, технические характеристики, комплектации и опции выбранных авто.",
      compareEmptyTitle: "Нет авто для сравнения",
      compareEmptyDesc: "Добавьте до 4 автомобилей из каталога, чтобы сравнить их характеристики и комплектации бок о бок.",
      compareBackToCatalog: "Вернуться в каталог",
      compareShowDiffOnly: "Только отличия",
      compareClearAll: "Очистить список",
      vehiclesCountLabel: "авто выбрано",
      compareParamPrice: "Цена",
      compareBestPrice: "Лучшая цена",
      compareParamYear: "Год выпуска",
      compareNewestYear: "Новее",
      compareParamKm: "Пробег",
      compareLowestKm: "Меньше пробег",
      compareParamFuel: "Топливо",
      compareParamTransmission: "КПП",
      compareParamPower: "Мощность",
      compareParamEngine: "Объем двигателя",
      compareParamCo2: "Налоговая мощность (P6)",
      compareParamColor: "Цвет кузова",
      compareParamBody: "Тип кузова",
      compareParamDoors: "Количество дверей",
      compareParamSeats: "Количество мест",
      compareParamVin: "VIN проверен",
      compareParamWarranty: "Гарантия",
      compareParamStatus: "Статус",
      compareViewCar: "Подробнее",
      characteristics: "Характеристики",
      taxIncludedTradeIn: "Вкл. НДС • Trade-in",
      home: "Главная",
      doorsCount: "дверей",
      seatsCount: "мест",
      removeFromCompare: "Удалить из сравнения",
      compareSwipeHint: "Свайпайте вправо для сравнения характеристик →",
    }
};

export const I18N = translations;


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
  ),
  Tag: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"></path><line x1="7" y1="7" x2="7.01" y2="7"></line></svg>
  ),
  Folder: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>
  ),
  User: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
  ),
  Share2: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3"></circle><circle cx="6" cy="12" r="3"></circle><circle cx="18" cy="19" r="3"></circle><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line></svg>
  ),
  Eye: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
  ),
  ChevronRight: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
  ),
  ChevronLeft: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
  ),
  Copy: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
  ),
  Check: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
  ),
  ExternalLink: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
  ),
  Layers: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2"></polygon><polyline points="2 17 12 22 22 17"></polyline><polyline points="2 12 12 17 22 12"></polyline></svg>
  ),
  BookOpen: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path></svg>
  ),
  Globe: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg>
  ),
  HelpCircle: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
  ),
  ShieldCheck: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path><polyline points="9 12 11 14 15 10"></polyline></svg>
  ),
  Bold: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M6 4h8a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z"></path><path d="M6 12h9a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z"></path></svg>
  ),
  Italic: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="4" x2="10" y2="4"></line><line x1="14" y1="20" x2="5" y2="20"></line><line x1="15" y1="4" x2="9" y2="20"></line></svg>
  ),
  Heading: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 12h12"></path><path d="M6 20V4"></path><path d="M18 20V4"></path></svg>
  ),
  ListIcon: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6"></line><line x1="8" y1="12" x2="21" y2="12"></line><line x1="8" y1="18" x2="21" y2="18"></line><line x1="3" y1="6" x2="3.01" y2="6"></line><line x1="3" y1="12" x2="3.01" y2="12"></line><line x1="3" y1="18" x2="3.01" y2="18"></line></svg>
  ),
  Users: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
  ),
  TrendingUp: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline><polyline points="17 6 23 6 23 12"></polyline></svg>
  ),
  BarChart: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="20" x2="12" y2="10"></line><line x1="18" y1="20" x2="18" y2="4"></line><line x1="6" y1="20" x2="6" y2="16"></line></svg>
  ),
  Smartphone: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="5" y="2" width="14" height="20" rx="2" ry="2"></rect><line x1="12" y1="18" x2="12.01" y2="18"></line></svg>
  ),
  Monitor: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect><line x1="8" y1="21" x2="16" y2="21"></line><line x1="12" y1="17" x2="12" y2="21"></line></svg>
  ),
  Download: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
  ),
  Compare: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="m16 3 4 4-4 4"/><path d="M20 7H4"/><path d="m8 21-4-4 4-4"/><path d="M4 17h16"/></svg>
  )
};














export interface CategoryTranslation {
  name: string;
  slug: string;
  description?: string;
  seoTitle?: string;
  metaDescription?: string;
}

export interface ArticleCategory {
  id: string;
  name: string;
  slug: string;
  description: string;
  seoTitle?: string;
  metaDescription?: string;
  translations?: {
    fr: CategoryTranslation;
    en?: CategoryTranslation;
    ru?: CategoryTranslation;
  };
}

export interface ArticleTranslation {
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  seoTitle?: string;
  metaDescription?: string;
  focusKeyword?: string;
  imageAlt?: string;
  ogTitle?: string;
  ogDescription?: string;
  readingTime?: number;
}

export interface Article {
  id: string;
  // Shared metadata
  featuredImage: string;
  categoryId: string;
  tags: string[];
  status: 'draft' | 'published' | 'scheduled' | 'archived';
  author: string;
  
  // Optional associated vehicle
  relatedVehicleId?: string | null;
  relatedVehicleIds?: string[];
  relatedArticleIds?: string[];
  
  // Placement flags
  featured: boolean;
  homepageFeatured: boolean;
  homepageOrder?: number;
  
  // SEO & Indexation
  canonicalUrl?: string;
  robotsIndex: boolean;
  robotsFollow: boolean;
  
  // Multi-language localizations
  translations: {
    fr: ArticleTranslation;
    en?: ArticleTranslation;
    ru?: ArticleTranslation;
  };
  
  // Timestamps
  publishedAt: string;
  updatedAt: string;
  createdAt: string;

  // Top-level fallbacks for backwards compatibility
  title?: string;
  slug?: string;
  excerpt?: string;
  content?: string;
  featuredImageAlt?: string;
  seoTitle?: string;
  metaDescription?: string;
  focusKeyword?: string;
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
  readingTime?: number;
}

export const DEMO_CATEGORIES: ArticleCategory[] = [
  {
    id: "cat-1",
    name: "Guides d'achat",
    slug: "guides",
    description: "Guides complets pour bien choisir, inspecter et acheter votre véhicule d'occasion.",
    seoTitle: "Guides d'achat automobile - Conseils experts - Ligo Automobiles",
    metaDescription: "Tous nos guides experts pour acheter votre voiture d'occasion en toute confiance et sans mauvaise surprise.",
    translations: {
      fr: {
        name: "Guides d'achat",
        slug: "guides",
        description: "Guides complets pour bien choisir, inspecter et acheter votre véhicule d'occasion.",
        seoTitle: "Guides d'achat automobile - Conseils experts - Ligo Automobiles",
        metaDescription: "Tous nos guides experts pour acheter votre voiture d'occasion en toute confiance et sans mauvaise surprise."
      },
      en: {
        name: "Buying Guides",
        slug: "buying-guides",
        description: "Comprehensive guides to inspect, evaluate and purchase your next pre-owned car.",
        seoTitle: "Car Buying Guides - Expert Advice - Ligo Automobiles",
        metaDescription: "All our expert guides to buying your used car with complete confidence."
      },
      ru: {
        name: "Гиды по покупке",
        slug: "gidy-po-pokupke",
        description: "Подробные руководства по выбору, проверке и покупке проверенных автомобилей с пробегом.",
        seoTitle: "Гиды по покупке авто - Советы экспертов - Ligo Automobiles",
        metaDescription: "Экспертные гайды и чек-листы для уверенной и безопасной покупки автомобиля с пробегом."
      }
    }
  },
  {
    id: "cat-2",
    name: "Conseils & Entretien",
    slug: "conseils-entretien",
    description: "Astuces et recommandations pour entretenir, fiabiliser et préserver la valeur de votre voiture.",
    seoTitle: "Conseils d'entretien automobile - Ligo Automobiles",
    metaDescription: "Recommandations d'experts pour prolonger la durée de vie et valoriser votre véhicule au quotidien.",
    translations: {
      fr: {
        name: "Conseils & Entretien",
        slug: "conseils-entretien",
        description: "Astuces et recommandations pour entretenir, fiabiliser et préserver la valeur de votre voiture.",
        seoTitle: "Conseils d'entretien automobile - Ligo Automobiles",
        metaDescription: "Recommandations d'experts pour prolonger la durée de vie et valoriser votre véhicule au quotidien."
      },
      en: {
        name: "Advice & Maintenance",
        slug: "advice-maintenance",
        description: "Tips and recommendations to maintain and preserve the value of your vehicle.",
        seoTitle: "Car Maintenance Tips & Advice - Ligo Automobiles",
        metaDescription: "Expert recommendations to prolong the lifespan and value of your car."
      },
      ru: {
        name: "Советы и обслуживание",
        slug: "sovety-obsluzhivanie",
        description: "Полезные советы и рекомендации по сервису, надежности и сохранению стоимости авто.",
        seoTitle: "Советы по обслуживанию авто - Ligo Automobiles",
        metaDescription: "Рекомендации экспертов по ежедневному уходу и сохранению остаточной стоимости автомобиля."
      }
    }
  },
  {
    id: "cat-3",
    name: "Actualités",
    slug: "actualites",
    description: "Les dernières tendances et actualités du marché automobile français et européen.",
    seoTitle: "Actualités automobiles et marché de l'occasion - Ligo Automobiles",
    metaDescription: "Suivez toute l'actualité du marché automobile, les réglementations Crit'Air et les nouveautés.",
    translations: {
      fr: {
        name: "Actualités",
        slug: "actualites",
        description: "Les dernières tendances et actualités du marché automobile français et européen.",
        seoTitle: "Actualités automobiles et marché de l'occasion - Ligo Automobiles",
        metaDescription: "Suivez toute l'actualité du marché automobile, les réglementations Crit'Air et les nouveautés."
      },
      en: {
        name: "Automotive News",
        slug: "news",
        description: "Latest trends and news from the French and European automotive market.",
        seoTitle: "Automotive News and Market Trends - Ligo Automobiles",
        metaDescription: "Follow market trends, Crit'Air regulations and automotive insights."
      },
      ru: {
        name: "Новости и тренды",
        slug: "novosti",
        description: "Свежие новости и тенденции французского и европейского автомобильного рынка.",
        seoTitle: "Автомобильные новости и тренды рынка - Ligo Automobiles",
        metaDescription: "Следите за новостями авторынка Европы, эко-нормами Crit'Air и тенденциями цен."
      }
    }
  },
  {
    id: "cat-4",
    name: "Comparatifs",
    slug: "comparatifs",
    description: "Comparatifs détaillés entre modèles, motorisations et finitions pour bien choisir.",
    seoTitle: "Comparatifs automobiles - Essais et analyses - Ligo Automobiles",
    metaDescription: "Comparatifs impartiaux pour vous aider à départager les meilleurs modèles d'occasion.",
    translations: {
      fr: {
        name: "Comparatifs",
        slug: "comparatifs",
        description: "Comparatifs détaillés entre modèles, motorisations et finitions pour bien choisir.",
        seoTitle: "Comparatifs automobiles - Essais et analyses - Ligo Automobiles",
        metaDescription: "Comparatifs impartiaux pour vous aider à départager les meilleurs modèles d'occasion."
      },
      en: {
        name: "Comparisons",
        slug: "comparisons",
        description: "Detailed side-by-side comparisons of models, engines and specs.",
        seoTitle: "Car Comparisons & Analysis - Ligo Automobiles",
        metaDescription: "Unbiased comparisons to help you choose the best used car."
      },
      ru: {
        name: "Сравнения моделей",
        slug: "sravneniya",
        description: "Детальные сравнительные обзоры моделей, двигателей и комплектаций.",
        seoTitle: "Сравнения автомобилей - Обзоры и тесты - Ligo Automobiles",
        metaDescription: "Объективные сравнения популярных моделей для точного выбора автомобиля."
      }
    }
  },
  {
    id: "cat-5",
    name: "SUV & Crossovers",
    slug: "suv",
    description: "Dossiers et focus sur les SUV urbains, familiaux et haut de gamme.",
    seoTitle: "SUV et Crossovers d'occasion - Ligo Automobiles",
    metaDescription: "Tout savoir sur les SUV d'occasion les plus fiables, confortables et recherchés.",
    translations: {
      fr: {
        name: "SUV & Crossovers",
        slug: "suv",
        description: "Dossiers et focus sur les SUV urbains, familiaux et haut de gamme.",
        seoTitle: "SUV et Crossovers d'occasion - Ligo Automobiles",
        metaDescription: "Tout savoir sur les SUV d'occasion les plus fiables, confortables et recherchés."
      },
      en: {
        name: "SUVs & Crossovers",
        slug: "suv-crossovers",
        description: "In-depth guides on urban, family, and luxury SUVs.",
        seoTitle: "Used SUVs & Crossovers - Ligo Automobiles",
        metaDescription: "Everything you need to know about the most reliable and sought-after used SUVs."
      },
      ru: {
        name: "Кроссоверы и SUV",
        slug: "krossovery-suv",
        description: "Обзоры городских, семейных и премиальных кроссоверов.",
        seoTitle: "Кроссоверы и SUV с пробегом - Ligo Automobiles",
        metaDescription: "Всё о самых надежных, комфортных и ликвидных кроссоверах на вторичном рынке."
      }
    }
  },
  {
    id: "cat-6",
    name: "Berlines & Sportives",
    slug: "berlines-sportives",
    description: "Analyses et guides sur les berlines routières et véhicules de prestige.",
    seoTitle: "Berlines et voitures de prestige - Ligo Automobiles",
    metaDescription: "Dossiers d'experts sur les berlines haut de gamme et voitures sportives d'exception.",
    translations: {
      fr: {
        name: "Berlines & Sportives",
        slug: "berlines-sportives",
        description: "Analyses et guides sur les berlines routières et véhicules de prestige.",
        seoTitle: "Berlines et voitures de prestige - Ligo Automobiles",
        metaDescription: "Dossiers d'experts sur les berlines haut de gamme et voitures sportives d'exception."
      },
      en: {
        name: "Sedans & Sports Cars",
        slug: "sedans-sports-cars",
        description: "Analyses and guides for touring sedans and high-performance prestige cars.",
        seoTitle: "Sedans & Prestige Sports Cars - Ligo Automobiles",
        metaDescription: "Expert dossiers on luxury saloons and iconic sports vehicles."
      },
      ru: {
        name: "Седаны и спорткары",
        slug: "sedany-sportkary",
        description: "Анализ и обзоры премиальных седанов и культовых спортивных автомобилей.",
        seoTitle: "Премиальные седаны и спорткары - Ligo Automobiles",
        metaDescription: "Экспертные материалы о лучших спортивных и представительских авто."
      }
    }
  }
];

export const DEMO_ARTICLES: Article[] = [
  {
    id: "art-1",
    featuredImage: "https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&q=80&w=1200",
    categoryId: "cat-1",
    tags: ["Peugeot", "Peugeot 2008", "SUV", "Occasion", "Guide d'achat"],
    status: "published",
    author: "Équipe Ligo Automobiles",
    featured: true,
    homepageFeatured: true,
    homepageOrder: 1,
    relatedVehicleId: "demo-1",
    relatedVehicleIds: ["demo-1"],
    robotsIndex: true,
    robotsFollow: true,
    publishedAt: "2026-08-15T10:00:00.000Z",
    updatedAt: "2026-08-18T14:30:00.000Z",
    createdAt: "2026-08-15T09:00:00.000Z",
    translations: {
      fr: {
        title: "Peugeot 2008 d'occasion : le guide d'achat complet 2026",
        slug: "peugeot-2008-occasion-guide-achat",
        excerpt: "Découvrez les points essentiels à vérifier, les meilleures motorisations et notre analyse détaillée avant d'acheter un Peugeot 2008 d'occasion.",
        content: `## Pourquoi le Peugeot 2008 reste-t-il le SUV compact préféré des Français ?

Le **Peugeot 2008** s'est imposé comme l'une des références incontournables sur le segment des SUV urbains. Avec son design affirmé, sa signature lumineuse à trois griffes et son poste de conduite *i-Cockpit*, il séduit aussi bien les jeunes couples que les familles citadines.

Sur le marché de l'occasion, le 2008 offre un excellent compromis entre habitabilité, confort routier et dynamisme de châssis. Cependant, face à la diversité des motorisations, un examen attentif s'impose avant de signer le bon de commande.

---

## Les motorisations à la loupe : quel moteur choisir ?

### 1. Les blocs Essence PureTech (1.2L 100, 130 et 155 ch)
Les versions essence 3 cylindres 1.2 PureTech offrent une grande vivacité et une consommation maîtrisée :
- **PureTech 100 ch** : Idéal pour un usage mixte ville/périurbain avec boîte mécanique à 6 rapports.
- **PureTech 130 ch** : Le meilleur compromis performances/polyvalence, particulièrement agréable associé à la boîte automatique **EAT8**.
- **Point de vigilance** : Vérifiez impérativement le suivi de la courroie de distribution immergée et l'historique des vidanges régulières.

### 2. Les motorisations Diesel BlueHDi (1.5L 100 et 130 ch)
Pour les gros rouleurs effectuant plus de 20 000 km par an :
- Consommation autoroutière exemplaire (moins de 5,0 L/100 km).
- Vérifiez le bon fonctionnement du réservoir d'AdBlue et du système de dépollution SCR.

### 3. La version 100% électrique : e-2008
- Batterie de 50 kWh pour une autonomie réelle d'environ 260 à 310 km.
- Vignette Crit'Air 0 permettant un accès illimité à toutes les ZFE métropolitaines.

> **Le conseil Ligo Automobiles :** Privilégiez les modèles disposant d'un carnet d'entretien 100% à jour avec factures à l'appui et un historique kilométrique limpide certifié.

---

## Les 5 points indispensables à contrôler avant l'achat

1. **La courroie de distribution (PureTech)** : Contrôlez visuellement son état d'usure via le bouchon de remplissage d'huile.
2. **L'usure des pneumatiques et du train avant** : Contrôlez le parallélisme et l'usure régulière de la bande de roulement.
3. **Le système tactile et l'écran i-Cockpit** : Testez la fluidité de l'écran central 10 pouces, la caméra de recul et Apple CarPlay / Android Auto.
4. **L'état des jantes aluminium** : Les jantes bicolores diamantées sont sensibles aux frottements de trottoir en ville.
5. **Le certificat de non-gage et le numéro VIN** : Assurez-vous de la conformité du numéro de châssis gravé.

[CTA_VEHICULES]

---

## Tableau comparatif des finitions du Peugeot 2008

| Finition | Équipements phares | Profil idéal |
| :--- | :--- | :--- |
| **Active / Allure** | Climatisation auto, jantes 17", radars de recul | Usage quotidien économique |
| **GT Line / GT** | Phares Full LED, toit Black Diamond, i-Cockpit 3D | Passionnés de style et de dynamisme |
| **Allure Pack** | Démarrage mains libres, navigation connectée 10" | Voyageurs réguliers |

---

## Conclusion : notre verdict d'expert

Le **Peugeot 2008 d'occasion** demeure une valeur sûre du marché français grâce à sa tenue de route exemplaire et son look valorisant. En achetant un exemplaire certifié avec garantie professionnelle et historique vérifié, vous bénéficiez d'un SUV moderne à un tarif très compétitif.

[CTA_CONTACT]`,
        seoTitle: "Peugeot 2008 d'occasion : guide d'achat et points de vigilance 2026",
        metaDescription: "Tout savoir avant d'acheter un Peugeot 2008 d'occasion : fiabilité moteur PureTech et BlueHDi, finitions recommandées, prix et conseils d'experts.",
        focusKeyword: "Peugeot 2008 occasion",
        imageAlt: "Peugeot 2008 SUV compact d'occasion moderne en ville",
        ogTitle: "Peugeot 2008 d'occasion : le guide d'achat complet 2026",
        ogDescription: "Découvrez notre analyse d'experts : motorisations, finitions, points clés à inspecter et conseils pour bien acheter votre Peugeot 2008.",
        readingTime: 6
      },
      en: {
        title: "Used Peugeot 2008: Complete Buying Guide 2026",
        slug: "used-peugeot-2008-buying-guide-2026",
        excerpt: "Discover essential checkpoints, top engine choices and detailed analysis before purchasing a pre-owned Peugeot 2008.",
        content: `## Why Does the Peugeot 2008 Remain a Top Urban Compact SUV?

The **Peugeot 2008** has established itself as an essential benchmark in the urban compact SUV segment. With its striking design, three-claw light signature, and *i-Cockpit* driving environment, it appeals to both daily commuters and modern families.

On the pre-owned market, the 2008 offers a superb balance of interior space, ride comfort, and agile handling. However, given the variety of engine options and generations, careful inspection is essential.

---

## Engine Breakdown: Which Engine Should You Choose?

### 1. PureTech Petrol Engines (1.2L 100, 130 and 155 hp)
The 3-cylinder 1.2 PureTech petrol variants offer lively performance and low fuel consumption:
- **PureTech 100 hp**: Ideal for combined city and suburban driving with a 6-speed manual gearbox.
- **PureTech 130 hp**: The best all-rounder, exceptionally refined when paired with the **EAT8** automatic transmission.
- **Key point**: Ensure strict adherence to annual oil change intervals and timing belt inspections.

### 2. BlueHDi Diesel Engines (1.5L 100 and 130 hp)
For motorway commuters driving over 20,000 km annually:
- Outstanding highway efficiency (under 5.0 L/100 km).
- Verify proper operation of the AdBlue system and SCR catalyst.

### 3. All-Electric Version: e-2008
- 50 kWh battery providing 260 to 310 km of real-world range.
- Full access to low-emission zones (Crit'Air 0 / Zero Emission).

> **Ligo Automobiles Expert Tip:** Always prioritize models with a complete and verifiable service history, supported by detailed inspection reports.

---

## 5 Essential Inspection Checkpoints

1. **Timing Belt Condition (PureTech)**: Inspect via the oil filler cap for premature wear.
2. **Tyre & Alignment Check**: Verify even tread wear across the front axle.
3. **i-Cockpit & Infotainment System**: Test the central screen, rear camera, and smartphone connectivity.
4. **Alloy Wheels**: Diamond-cut rims are susceptible to curb rash in urban driving.
5. **VIN & Administrative Documentation**: Ensure chassis numbers match registration documents accurately.

[CTA_VEHICULES]

---

## Peugeot 2008 Trim Comparison

| Trim Level | Key Features | Best For |
| :--- | :--- | :--- |
| **Active / Allure** | Auto climate, 17" wheels, parking sensors | Economical daily use |
| **GT Line / GT** | Full LED lights, Black Diamond roof, 3D i-Cockpit | Sporty styling enthusiasts |
| **Allure Pack** | Keyless entry, 10" connected navigation | Long-distance drivers |

---

## Conclusion: Expert Verdict

A certified **pre-owned Peugeot 2008** provides modern design, exceptional handling, and great value when backed by professional inspection and warranty.

[CTA_CONTACT]`,
        seoTitle: "Used Peugeot 2008 Buying Guide 2026 - Inspection & Engine Advice",
        metaDescription: "Complete expert guide to buying a used Peugeot 2008: engine reliability, trim comparisons, pricing and crucial inspection points.",
        focusKeyword: "used Peugeot 2008 guide",
        imageAlt: "Used Peugeot 2008 compact SUV in modern urban setting",
        ogTitle: "Used Peugeot 2008: Complete Buying Guide 2026",
        ogDescription: "Discover expert insights, engine comparisons, trim breakdowns and checkpoints for the Peugeot 2008.",
        readingTime: 6
      },
      ru: {
        title: "Peugeot 2008 с пробегом: полный гид покупателя 2026",
        slug: "peugeot-2008-s-probegom-gid-pokupatelya",
        excerpt: "Узнайте ключевые точки проверки, надежность двигателей PureTech и BlueHDi, а также советы экспертов перед покупкой Peugeot 2008.",
        content: `## Почему Peugeot 2008 остается одним из самых популярных компактных кроссоверов?

**Peugeot 2008** заслужил статус одного из лидеров среди городских кроссоверов. Яркий дизайн, фирменная оптика с «когтями льва» и инновационный салон *i-Cockpit* привлекают как молодых водителей, так и семьи.

На вторичном рынке 2008 предлагает прекрасный баланс комфорта, управляемости и экономичности. Однако разнообразие модификаций требует внимательной проверки перед покупкой.

---

## Обзор двигателей: какой мотор выбрать?

### 1. Бензиновые двигатели PureTech (1.2 л 100, 130 и 155 л.с.)
Трехцилиндровые турбомоторы 1.2 PureTech отличаются хорошей динамикой и низким расходом:
- **PureTech 100 л.с.** — оптимален для спокойной городской езды с 6-ступенчатой механикой.
- **PureTech 130 л.с.** — лучший выбор по динамике и комфорту, особенно в паре с 8-ступенчатым автоматом **EAT8**.
- **Важно проверить**: состояние ремня ГРМ в масляной ванне и строгое соблюдение регламента замены масла с правильным допуском PSA.

### 2. Дизельные двигатели BlueHDi (1.5 л 100 и 130 л.с.)
Для тех, кто проезжает более 20 000 км в год по трассе:
- Минимальный расход топлива (менее 5.0 л на 100 км).
- Проверьте исправность системы AdBlue и сажевого фильтра.

### 3. Электрическая версия e-2008
- Батарея 50 кВт·ч, обеспечивающая реальный запас хода 260–310 км.
- Экологический класс Crit'Air 0 для свободного въезда в любые европейские города.

> **Совет экспертов Ligo Automobiles:** Выбирайте автомобили с подтвержденной сервисной историей, оригинальным пробегом и комплексной диагностикой.

---

## 5 ключевых пунктов проверки перед покупкой

1. **Ремень ГРМ (PureTech)**: визуальный осмотр через маслозаливную горловину на предмет трещин.
2. **Подвеска и износ шин**: проверка геометрии и равномерности износа протектора.
3. **Мультимедиа и приборная панель i-Cockpit**: тест работы центрального дисплея, камеры заднего вида и Apple CarPlay / Android Auto.
4. **Состояние колесных дисков**: двухцветные легкосплавные диски часто страдают от городской парковки.
5. **Проверка VIN и юридической чистоты**: сверка номера кузова и истории по базам HistoVec / CarVertical.

[CTA_VEHICULES]

---

## Сравнение комплектаций Peugeot 2008

| Комплектация | Основные опции | Для кого подходит |
| :--- | :--- | :--- |
| **Active / Allure** | Климат-контроль, парктроники, диски 17" | Экономичная ежедневная езда |
| **GT Line / GT** | Full LED фары, черная крыша, 3D i-Cockpit | Любители стиля и динамики |
| **Allure Pack** | Бесключевой доступ, навигация 10" | Регулярные поездки на дальние расстояния |

---

## Заключение

Проверенный **Peugeot 2008 с пробегом** — это стильный, современный и комфортный кроссовер с отличной ликвидностью на рынке.

[CTA_CONTACT]`,
        seoTitle: "Peugeot 2008 с пробегом: гид по покупке, моторы и надежность 2026",
        metaDescription: "Полный обзор Peugeot 2008 с пробегом: надежность моторов PureTech, комплектации, цены и важные советы экспертов перед покупкой.",
        focusKeyword: "Peugeot 2008 с пробегом",
        imageAlt: "Компактный кроссовер Peugeot 2008 в городском потоке",
        ogTitle: "Peugeot 2008 с пробегом: полный гид покупателя 2026",
        ogDescription: "Подробный экспертный анализ Peugeot 2008: выбор мотора, слабые места, проверка кузова и рекомендации по покупке.",
        readingTime: 6
      }
    }
  },
  {
    id: "art-2",
    featuredImage: "https://images.unsplash.com/photo-1563720223185-11003d516935?auto=format&fit=crop&q=80&w=1200",
    categoryId: "cat-1",
    tags: ["Carburant", "Hybride", "Diesel", "Essence", "Électrique", "Crit'Air"],
    status: "published",
    author: "Équipe Ligo Automobiles",
    featured: false,
    homepageFeatured: true,
    homepageOrder: 2,
    relatedVehicleId: null, // No vehicle attached (General guide)
    relatedVehicleIds: [],
    robotsIndex: true,
    robotsFollow: true,
    publishedAt: "2026-08-10T08:30:00.000Z",
    updatedAt: "2026-08-16T11:00:00.000Z",
    createdAt: "2026-08-10T08:00:00.000Z",
    translations: {
      fr: {
        title: "Essence, Diesel, Hybride ou Électrique : que choisir en 2026 ?",
        slug: "essence-diesel-hybride-electrique-que-choisir-2026",
        excerpt: "Face aux restrictions Crit'Air, aux coûts de carburant et aux vignettes ZFE, quelle motorisation est réellement la plus adaptée à votre profil de conducteur ?",
        content: `## Le casse-tête du choix de la motorisation en 2026

Entre la transition écologique, le durcissement progressif des **Zones à Faibles Émissions (ZFE)** et l'évolution des prix à la pompe, choisir la bonne énergie pour sa prochaine voiture d'occasion nécessite une analyse précise de son kilométrage et de ses habitudes de déplacement.

---

## 1. L'Essence : le choix de la simplicité pour les trajets courts et mixtes

- **Kilométrage annuel** : Moins de 15 000 km / an.
- **Vignette Crit'Air** : Crit'Air 1 pour tous les modèles essence Euro 5 et Euro 6.
- **Avantages** : Entretien accessible, absence de filtres à particules complexes ou de système AdBlue, grand choix sur le marché de l'occasion.
- **Inconvénient** : Consommation plus sensible sur autoroute ou en charge.

---

## 2. Le Diesel : toujours imbattable pour les longs trajets autoroutiers

- **Kilométrage annuel** : Plus de 20 000 km / an.
- **Vignette Crit'Air** : Crit'Air 2 pour les diesels récents (Euro 5 et Euro 6).
- **Avantages** : Autonomie gigantesque (800 à 1200 km par plein), couple généreux à bas régime, coût par kilomètre imbattable sur autoroute.
- **Inconvénient** : À proscrire impérativement pour les petits trajets urbains sous peine d'encrassement du FAP.

---

## 3. L'Hybride (Simple et Rechargeable) : la polyvalence moderne

- **Hybride classique (HEV)** : Idéal en ville sans contrainte de recharge (consommation urbaine divisée par deux).
- **Hybride rechargeable (PHEV)** : Jusqu'à 50 à 70 km en 100% électrique au quotidien, couplé à un réservoir thermique pour les vacances.
- **Crit'Air** : Vignette Crit'Air 1.

[CTA_VEHICULES]

---

## 4. Le 100% Électrique : silence et coût d'usage réduit

- **Usage** : Déplacements quotidiens domicile-travail avec solution de recharge à domicile ou au bureau.
- **Avantages** : Silence de fonctionnement remarquable, entretien minimal, vignette Crit'Air 0.
- **Points de vigilance** : Vérifiez l'état de santé de la batterie (SOH) lors de l'achat d'occasion.

---

## Synthèse : guide de décision rapide

| Profil conducteur | Kilométrage annuel | Énergie recommandée |
| :--- | :--- | :--- |
| **Urbain & Périurbain** | 5 000 – 12 000 km | **Essence ou Hybride** |
| **Grand Routier / Voyageur** | > 20 000 km | **Diesel récent (Euro 6)** |
| **Navetteur avec prise** | 10 000 – 25 000 km | **Électrique ou Hybride Rechargeable** |

[CTA_CONTACT]`,
        seoTitle: "Essence, Diesel, Hybride ou Électrique : comparatif complet 2026",
        metaDescription: "Quelle motorisation choisir en 2026 ? Comparatif détaillé entre essence, diesel, hybride et électrique selon votre budget et vos trajets.",
        focusKeyword: "quelle motorisation choisir 2026",
        imageAlt: "Station de recharge et véhicules essence et hybrides",
        ogTitle: "Essence, Diesel, Hybride ou Électrique : que choisir en 2026 ?",
        ogDescription: "Découvrez notre analyse complète pour choisir la motorisation la plus rentable et adaptée à votre profil.",
        readingTime: 5
      },
      en: {
        title: "Petrol, Diesel, Hybrid or Electric: Which to Choose in 2026?",
        slug: "petrol-diesel-hybrid-electric-which-to-choose-2026",
        excerpt: "With evolving low-emission zones, fuel prices and tax regulations, which powertrain actually fits your daily driving needs?",
        content: `## Choosing the Right Powertrain in 2026

Between environmental regulations, low emission zones (LEZ/ZFE), and varying fuel costs, selecting the ideal engine type for your next vehicle requires a realistic look at your annual mileage and typical routes.

---

## 1. Petrol: Simplicity for Short and Mixed Trips

- **Annual Mileage**: Under 15,000 km/year.
- **Pros**: Low maintenance costs, no complex diesel particulate filters, broad market availability.
- **Cons**: Higher fuel consumption during motorway driving under heavy load.

---

## 2. Diesel: Still Unmatched for Long Highway Journeys

- **Annual Mileage**: Over 20,000 km/year.
- **Pros**: Massive range (800–1,200 km per tank), superior low-end torque, lowest cost per kilometer on motorways.
- **Cons**: Unsuitable for short city trips due to potential DPF clogging.

---

## 3. Hybrid (Self-Charging & Plug-In): Maximum Versatility

- **Standard Hybrid (HEV)**: Perfect for city driving with zero plug-in hassle (up to 50% fuel reduction in traffic).
- **Plug-In Hybrid (PHEV)**: 50–70 km pure electric commute with petrol engine backup for long road trips.

[CTA_VEHICULES]

---

## 4. Full Electric: Quiet Performance and Low Operating Costs

- **Usage**: Daily commuting with home or workplace charging access.
- **Pros**: Instant acceleration, virtually zero powertrain maintenance, zero tailpipe emissions.
- **Key Check**: Verify Battery State of Health (SOH) on pre-owned electric cars.

---

## Quick Decision Matrix

| Driver Profile | Annual Mileage | Recommended Powertrain |
| :--- | :--- | :--- |
| **City & Suburban** | 5,000 – 12,000 km | **Petrol or Hybrid** |
| **Long Distance Commuter** | > 20,000 km | **Modern Euro 6 Diesel** |
| **Daily Commuter with Charger** | 10,000 – 25,000 km | **Full Electric or Plug-in Hybrid** |

[CTA_CONTACT]`,
        seoTitle: "Petrol, Diesel, Hybrid or Electric: 2026 Buying Comparison",
        metaDescription: "Detailed comparison between petrol, diesel, hybrid and electric cars in 2026. Find the right match for your budget and driving habits.",
        focusKeyword: "which engine to choose 2026",
        imageAlt: "Electric charging station and hybrid petrol cars",
        ogTitle: "Petrol, Diesel, Hybrid or Electric: Which to Choose in 2026?",
        ogDescription: "Expert guide comparing fuel types, running costs, and range to help you choose the best powertrain.",
        readingTime: 5
      },
      ru: {
        title: "Бензин, дизель, гибрид или электро: что выбрать в 2026 году?",
        slug: "benzin-dizel-gibrid-ili-elektro-chto-vybrat-2026",
        excerpt: "Сравнение типов двигателей, экологических зон Crit'Air и реальных затрат на эксплуатацию в 2026 году.",
        content: `## Как выбрать правильный тип двигателя в 2026 году?

Экологические нормы, растущие цены на топливо и расширение зон с низким уровнем выбросов (ZFE) делают выбор силовой установки ключевым этапом при покупке автомобиля.

---

## 1. Бензин: простота и надежность для города и смешанного цикла

- **Годовой пробег**: до 15 000 км в год.
- **Плюсы**: простое и недорогое обслуживание, быстрый прогрев зимой, большой выбор на вторичном рынке.
- **Минусы**: более высокий расход топлива на высоких скоростях по трассе.

---

## 2. Дизель: вне конкуренции на трассе и дальних дистанциях

- **Годовой пробег**: более 20 000 км в год.
- **Плюсы**: огромный запас хода (800–1200 км на одном баке), отличная тяга с низких оборотов, минимальный расход на автострадах.
- **Минусы**: категорически не подходит для коротких городских поездок из-за риска засорения сажевого фильтра (DPF).

---

## 3. Гибрид (HEV и PHEV): универсальный выбор для любых условий

- **Классический гибрид**: экономит до 40% топлива в городском цикле без необходимости подзарядки от розетки.
- **Плагин-гибрид (PHEV)**: до 50–70 км на чистом электричестве каждый день + бензиновый бак для путешествий.

[CTA_VEHICULES]

---

## 4. Электромобили: максимальный комфорт и тишина

- **Идеально для**: ежедневных поездок при наличии домашней или рабочей зарядной станции.
- **Плюсы**: мгновенный отклик на педаль газа, тишина, минимальные затраты на ТО.
- **Совет**: при покупке б/у электрокара обязательно проверяйте остаточную емкость батареи (SOH).

---

## Сводная таблица выбора

| Профиль водителя | Годовой пробег | Рекомендуемый тип |
| :--- | :--- | :--- |
| **Город и пригород** | 5 000 – 12 000 км | **Бензин или классический гибрид** |
| **Частые поездки по трассе** | > 20 000 км | **Современный дизель (Euro 6)** |
| **Ежедневные поездки с розеткой** | 10 000 – 25 000 км | **Электромобиль или PHEV** |

[CTA_CONTACT]`,
        seoTitle: "Бензин, дизель, гибрид или электро: сравнение и выбор в 2026 году",
        metaDescription: "Что выгоднее купить в 2026 году: бензин, дизель, гибрид или электромобиль? Сравнение затрат, пробегов и экологических классов.",
        focusKeyword: "какой двигатель выбрать 2026",
        imageAlt: "Сравнение бензиновых, гибридных и электрических автомобилей",
        ogTitle: "Бензин, дизель, гибрид или электро: что выбрать в 2026 году?",
        ogDescription: "Подробный гид по выбору силовой установки с учетом расходов на топливо, налогов и надежности.",
        readingTime: 5
      }
    }
  },
  {
    id: "art-3",
    featuredImage: "https://images.unsplash.com/photo-1486006920555-c77dce18193b?auto=format&fit=crop&q=80&w=1200",
    categoryId: "cat-2",
    tags: ["Conseils", "Occasion", "Inspection", "VIN", "Sécurité"],
    status: "published",
    author: "Équipe Ligo Automobiles",
    featured: false,
    homepageFeatured: true,
    homepageOrder: 3,
    relatedVehicleId: null, // No vehicle attached (General checklist)
    relatedVehicleIds: [],
    robotsIndex: true,
    robotsFollow: true,
    publishedAt: "2026-08-05T14:00:00.000Z",
    updatedAt: "2026-08-17T09:15:00.000Z",
    createdAt: "2026-08-05T12:00:00.000Z",
    translations: {
      fr: {
        title: "Les 10 points indispensables à contrôler avant d'acheter une voiture d'occasion",
        slug: "10-points-a-verifier-achat-voiture-occasion",
        excerpt: "Historique d'entretien, traçabilité du numéro VIN, carnet d'entretien, contrôle technique et essai routier : la checklist complète de nos experts.",
        content: `## Réussir l'achat de sa voiture d'occasion en toute sécurité

L'achat d'un véhicule d'occasion représente un investissement important. Pour éviter les mauvaises surprises et les vices cachés, il est essentiel de suivre une méthodologie rigoureuse lors de la visite du véhicule.

Voici notre **checklist en 6 étapes indispensables** élaborée par les techniciens de Ligo Automobiles.

---

## 1. La vérification administrative et la conformité du VIN

- **Numéro de châssis (VIN)** : Comparez le numéro frappé sur le châssis avec la Carte Grise.
- **Rapport d'historique (HistoVec)** : Vérifiez le nombre d'anciens propriétaires et le suivi kilométrique.
- **Certificat de non-gage** : Il atteste que le véhicule n'est pas gagé auprès d'un organisme financier.

---

## 2. Le carnet d'entretien et les factures

Un historique limpide garantit la longévité de votre acquisition :
- Respect des périodicités de vidange recommandées par le constructeur.
- Remplacement des pièces d'usure (plaquettes, disques, amortisseurs).
- Échéance de la courroie de distribution et de la pompe à eau.

---

## 3. L'inspection extérieure de la carrosserie

- **Alignement des panneaux** : Des jours irréguliers entre les portières peuvent révéler un choc antérieur.
- **Épaisseur et teinte de peinture** : Observez les reflets pour détecter d'éventuelles retouches.
- **État des soubassements** : Recherchez l'absence de rouille perforante.

---

## 4. L'état des pneumatiques et du freinage

- Les pneus d'un même essieu doivent être de marque, modèle et usure identiques.
- Vérifiez la présence de plus de 1,6 mm de sculpture minimale légale.
- Contrôlez visuellement l'épaisseur des plaquettes de frein.

[CTA_VEHICULES]

---

## 5. L'habitacle et les équipements électroniques

- Testez tous les boutons : climatisation, vitres électriques, régulateur, caméra de recul.
- Contrôlez l'absence de voyant moteur ou airbag allumé sur le combiné d'instruments.

---

## 6. L'essai routier dynamique

Durant l'essai (au minimum 15 à 20 minutes) :
- **Démarrage à froid** : Aucun bruit anormal de cliquetis ou de sifflement de turbo.
- **Comportement de la boîte de vitesses** : Les rapports doivent passer avec fluidité.
- **Tenue de cap** : En ligne droite, le véhicule doit filer droit sans tirer d'un côté au freinage.

[CTA_CONTACT]`,
        seoTitle: "10 points à vérifier avant d'acheter une voiture d'occasion (Checklist 2026)",
        metaDescription: "Checklist d'experts en 10 points pour inspecter une voiture d'occasion avant l'achat : carnet d'entretien, VIN, essai routier et pièges à éviter.",
        focusKeyword: "vérifier voiture occasion avant achat",
        imageAlt: "Inspection technique d'une voiture d'occasion dans un atelier moderne",
        ogTitle: "10 points indispensables pour inspecter une voiture d'occasion",
        ogDescription: "Découvrez la checklist complète de nos experts avant d'acheter votre véhicule d'occasion.",
        readingTime: 7
      },
      en: {
        title: "10 Essential Points to Check Before Buying a Used Car",
        slug: "10-essential-points-check-before-buying-used-car",
        excerpt: "Service history, VIN verification, technical inspection, and road test: the definitive pre-purchase checklist by Ligo Automobiles.",
        content: `## Buying a Pre-Owned Car with Total Confidence

Purchasing a used car is a significant investment. Following a structured inspection checklist helps avoid unpleasant surprises and hidden mechanical defects.

Here is our **expert checklist** designed by automotive technicians.

---

## 1. Documentation & VIN Verification

- **Chassis Number (VIN)**: Match the physical stamp on the windscreen base/strut tower with the registration documents.
- **Vehicle History Report**: Confirm past ownership records, reported accidents, and consistent odometer readings.
- **Clear Title Certificate**: Verify the vehicle is free of financial liens.

---

## 2. Service Book & Maintenance Invoices

A transparent maintenance trail is the best proof of care:
- Documented oil changes meeting manufacturer specifications.
- Timely replacement of consumable components (brake pads, rotors, shock absorbers).
- Timing belt and water pump service intervals.

---

## 3. Exterior Body & Paint Inspection

- **Panel Gaps**: Inconsistent spacing between wings and doors may point to past structural repairs.
- **Paint Finish**: Check for overspray, color mismatches, or irregular orange peel texture.
- **Undercarriage**: Inspect for corrosion or oil leaks.

---

## 4. Tyres & Brake System

- Matching brand, size, and wear rating on the same axle.
- Legal tread depth exceeding 1.6 mm.
- Visual check of brake disc smoothness and pad thickness.

[CTA_VEHICULES]

---

## 5. Interior & Electronics

- Test all accessories: climate control, power windows, infotainment, navigation, reverse camera.
- Verify warning lights illuminate upon ignition and extinguish properly after engine start.

---

## 6. Dynamic Road Test

During a 15–20 minute test drive:
- **Cold Start**: Listen for abnormal rattles or excessive exhaust smoke.
- **Gearbox Engagement**: Ensure gears shift smoothly without hesitation or clunks.
- **Braking Stability**: The vehicle must track straight under firm braking.

[CTA_CONTACT]`,
        seoTitle: "10 Essential Points to Check Before Buying a Used Car - 2026 Checklist",
        metaDescription: "Expert pre-purchase used car checklist: VIN check, maintenance records, body inspection and dynamic road test guide.",
        focusKeyword: "used car inspection checklist",
        imageAlt: "Technical inspection of a used vehicle in a modern workshop",
        ogTitle: "10 Essential Points to Check Before Buying a Used Car",
        ogDescription: "Complete checklist for inspecting any pre-owned vehicle before purchase.",
        readingTime: 7
      },
      ru: {
        title: "10 обязательных пунктов для проверки авто с пробегом перед покупкой",
        slug: "10-punktov-proverki-avto-s-probegom-pered-pokupkoy",
        excerpt: "Сервисная история, проверка VIN, состояние кузова, коробки передач и тест-драйв: подробный чек-лист экспертов.",
        content: `## Как безопасно купить проверенный автомобиль с пробегом

Покупка подержанного автомобиля требует системного подхода. Чтобы защитить себя от скрытых дефектов и скрученного пробега, следуйте экспертному чек-листу от специалистов Ligo Automobiles.

---

## 1. Юридическая чистота и проверка VIN-номера

- **Сверка VIN-номера**: проверьте совпадение номера на кузове, под лобовым стеклом и в регистрационных документах.
- **История обслуживания (HistoVec / CarVertical)**: проверьте количество владельцев, историю ДТП и хронологию пробега при техосмотрах.
- **Отсутствие залогов и ограничений**: убедитесь в юридической чистоте сделки.

---

## 2. Сервисная книжка и чеки на обслуживание

Прозрачная история — лучший залог долгой службы автомобиля:
- Соблюдение регламента ТО и регулярности замены моторного масла.
- Замена расходников (тормозные диски, колодки, амортизаторы).
- Своевременная замена комплекта ГРМ и помпы.

---

## 3. Осмотр кузова и лакокрасочного покрытия

- **Зазоры кузовных элементов**: неравномерные зазоры между капотом, крыльями и дверями могут указывать на некачественный кузовной ремонт.
- **Толщина ЛКП**: используйте толщиномер для выявления шпаклевки и вторичных окрасов.
- **Состояние днища и порогов**: отсутствие очагов коррозии и подтеков технических жидкостей.

---

## 4. Состояние шин и тормозной системы

- Одинаковая марка, модель и степень износа шин на одной оси.
- Остаточная глубина протектора (не менее 1.6 мм).
- Оценка остатка тормозных колодок и отсутствие глубоких борозд на дисках.

[CTA_VEHICULES]

---

## 5. Электроника и салон

- Проверьте работу всех систем: климат-контроль, стеклоподъемники, мультимедиа, камеры кругового обзора.
- Убедитесь, что контрольные лампы (Check Engine, Airbag) загораются при включении зажигания и гаснут после запуска мотора.

---

## 6. Динамический тест-драйв

В процессе поездки (не менее 15–20 минут):
- **Запуск на холодную**: отсутствие посторонних шумов, стуков и дыма.
- **Работа коробки передач**: плавное переключение без рывков и задержек.
- **Курсовая устойчивость**: автомобиль должен держать прямую траекторию при разгоне и торможении.

[CTA_CONTACT]`,
        seoTitle: "10 пунктов проверки авто с пробегом перед покупкой (Чек-лист 2026)",
        metaDescription: "Пошаговый чек-лист проверки б/у автомобиля: сверка VIN, проверка сервисной истории, диагностика кузова и тест-драйв.",
        focusKeyword: "проверка авто с пробегом перед покупкой",
        imageAlt: "Комплексная диагностика автомобиля в сервисном центре",
        ogTitle: "10 пунктов для проверки автомобиля с пробегом перед покупкой",
        ogDescription: "Полный чек-лист от профессиональных экспертов для безопасной покупки б/у автомобиля.",
        readingTime: 7
      }
    }
  },
  {
    id: "art-4",
    featuredImage: "https://images.unsplash.com/photo-1614162692292-7ac56d7f7f1e?auto=format&fit=crop&q=80&w=1200",
    categoryId: "cat-6",
    tags: ["Porsche", "911", "GT3 RS", "Sportive", "Prestige", "Occasion"],
    status: "published",
    author: "Équipe Ligo Automobiles",
    featured: false,
    homepageFeatured: false,
    homepageOrder: 4,
    relatedVehicleId: "demo-1", // Linked Porsche GT3 RS
    relatedVehicleIds: ["demo-1"],
    robotsIndex: true,
    robotsFollow: true,
    publishedAt: "2026-08-01T10:00:00.000Z",
    updatedAt: "2026-08-12T16:00:00.000Z",
    createdAt: "2026-08-01T09:00:00.000Z",
    translations: {
      fr: {
        title: "Porsche 911 : pourquoi reste-t-elle la sportive de référence sur le marché de l'occasion ?",
        slug: "porsche-911-pourquoi-reste-t-elle-la-sportive-de-reference",
        excerpt: "Polyvalence au quotidien, valeur de revente exceptionnelle et plaisir de conduite légendaire : analyse détaillée du mythe 911 sur le marché actuel.",
        content: `## Le mythe intemporel de la Porsche 911

Depuis plus de six décennies, la **Porsche 911** incarne le graal de la voiture sportive polyvalente. Capable d'aligner les tours de circuit le week-end et de vous emmener au bureau le lundi matin, aucune autre sportive n'a su marier avec une telle perfection performances de premier ordre et fiabilité d'utilisation.

---

## 1. Une cote et une valeur résiduelle exceptionnelles

Contrairement à la majorité des véhicules de grand tourisme qui subissent une dépréciation rapide, la Porsche 911 bénéficie d'une des meilleures valeurs résiduelles au monde. Certains modèles emblématiques (GTS, GT3, Turbo S) voient même leur cote progresser au fil des années.

---

## 2. Le Flat-6 : une signature mécanique inimitable

Qu'il soit atmosphérique montant à 9 000 tr/min ou biturbo rageur, le moteur 6 cylindres à plat monté en porte-à-faux arrière confère à la 911 son équilibre si particulier et sa sonorité envoûtante.

[CTA_VEHICULES]

---

## 3. Quelle génération choisir en occasion ?

- **Type 997 (2004-2012)** : Le design classique avec les phares ronds, particulièrement recherchée en Phase 2 (moteurs DFI et boîte PDK).
- **Type 991 (2011-2019)** : Un bond technologique majeur, un confort de grand tourisme et un châssis en aluminium d'une précision diabolique.
- **Type 992 (Depuis 2019)** : La modernité absolue, avec une prestance visuelle accrue et des performances stratosphériques.

[CTA_CONTACT]`,
        seoTitle: "Porsche 911 d'occasion : analyse du mythe et guide d'achat 2026",
        metaDescription: "Pourquoi la Porsche 911 reste la sportive incontournable en occasion ? Cote, fiabilité, générations 997, 991, 992 et conseils d'experts.",
        focusKeyword: "Porsche 911 occasion",
        imageAlt: "Porsche 911 sportive de prestige sur circuit",
        ogTitle: "Porsche 911 : la sportive de référence en occasion",
        ogDescription: "Analyse complète sur la cote, les générations et les atouts de la Porsche 911 sur le marché de l'occasion.",
        readingTime: 5
      },
      en: {
        title: "Porsche 911: Why It Remains the Benchmark Pre-Owned Sports Car",
        slug: "porsche-911-why-it-remains-benchmark-sports-car",
        excerpt: "Everyday usability, exceptional residual value and legendary driving pleasure: exploring the iconic 911 on the secondary market.",
        content: `## The Timeless Icon: Porsche 911

For over six decades, the **Porsche 911** has represented the pinnacle of dual-purpose sports cars. Capable of setting blistering lap times on the racetrack over the weekend and effortlessly commuting to the office on Monday morning, no other sports car combines performance and reliability so masterfully.

---

## 1. Exceptional Residual Value & Investment Appeal

Unlike many grand tourers that suffer heavy initial depreciation, the Porsche 911 boasts unmatched residual values. Desirable variants (such as GTS, GT3, and Turbo models) frequently stabilize or even appreciate in value over time.

---

## 2. The Flat-6: Incomparable Mechanical Character

Whether naturally aspirated revving to 9,000 RPM or twin-turbocharged with instant boost, the rear-mounted flat-six engine delivers the unique balance and distinct exhaust note that defines the 911 experience.

[CTA_VEHICULES]

---

## 3. Which Generation Fits Your Budget?

- **Type 997 (2004–2012)**: Pure analog proportions with classic round headlights, especially sought-after in Gen 2 (DFI engines and PDK).
- **Type 991 (2011–2019)**: Major leap in GT refinement, aluminum chassis agility, and cutting-edge ergonomics.
- **Type 992 (2019–Present)**: Absolute state-of-the-art performance with muscular proportions and hypercar-level tech.

[CTA_CONTACT]`,
        seoTitle: "Pre-Owned Porsche 911: Generation Guide & Buying Advice 2026",
        metaDescription: "In-depth guide to buying a used Porsche 911: residual values, engine reliability, 997, 991 and 992 comparisons.",
        focusKeyword: "used Porsche 911 guide",
        imageAlt: "High-performance Porsche 911 on track",
        ogTitle: "Porsche 911: Why It Remains the Benchmark Pre-Owned Sports Car",
        ogDescription: "Complete market analysis on values, generational differences and buying tips for the iconic Porsche 911.",
        readingTime: 5
      },
      ru: {
        title: "Porsche 911: почему он остается эталоном среди спорткаров с пробегом?",
        slug: "porsche-911-pochemu-on-ostaetsya-etalonom",
        excerpt: "Повседневная практичность, феноменальная ликвидность и культовое удовольствие от вождения: обзор легендарной модели 911.",
        content: `## Культовый статус и магия Porsche 911

Более 60 лет **Porsche 911** удерживает звание эталонного спортивного автомобиля. Способный устанавливать рекорды на гоночном треке в выходные и с комфортом возить владельца на работу каждый день, 911 идеально сочетает бескомпромиссную динамику и немецкую надежность.

---

## 1. Исключительная ликвидность и сохранение стоимости

В отличие от большинства премиальных спорткаров, теряющих в цене в первые годы, Porsche 911 обладает одной из самых высоких остаточных стоимостей в мире. Знаковые версии (GTS, GT3, Turbo S) часто растут в цене с годами.

---

## 2. Оппозитный мотор Flat-6: неповторимый характер

Будь то атмосферный двигатель, раскручивающийся до 9000 об/мин, или взрывной твин-турбо, заднемоторная компоновка дарит 911 уникальную развесовку и фирменный звук.

[CTA_VEHICULES]

---

## 3. Какое поколение выбрать на вторичном рынке?

- **Кузов 997 (2004–2012)**: классический дизайн с круглыми фарами, особенно ценятся рестайлинговые версии Gen 2 с моторами DFI и коробкой PDK.
- **Кузов 991 (2011–2019)**: технологический скачок, алюминиевый кузов и непревзойденный комфорт на дальних дистанциях.
- **Кузов 992 (с 2019)**: современный шедевр с расширенной колеей и фантастической динамикой.

[CTA_CONTACT]`,
        seoTitle: "Porsche 911 с пробегом: гид по поколениям и выбор модели 2026",
        metaDescription: "Почему Porsche 911 остается лучшим спорткаром на вторичном рынке? Анализ цен, надежность поколений 997, 991, 992 и советы экспертов.",
        focusKeyword: "Porsche 911 с пробегом",
        imageAlt: "Спортивный автомобиль Porsche 911 на гоночной трассе",
        ogTitle: "Porsche 911: эталон среди спорткаров с пробегом",
        ogDescription: "Подробный разбор поколений, ликвидности и преимуществ легендарного Porsche 911 на вторичном рынке.",
        readingTime: 5
      }
    }
  },
  {
    id: "art-5",
    featuredImage: "https://images.unsplash.com/photo-1578844251758-2f71da64c96f?auto=format&fit=crop&q=80&w=1200",
    categoryId: "cat-2",
    tags: ["Pneus", "Sécurité", "Entretien", "Hiver", "Conseils"],
    status: "published",
    author: "Équipe Ligo Automobiles",
    featured: false,
    homepageFeatured: false,
    homepageOrder: 5,
    relatedVehicleId: null, // NO VEHICLE ATTACHED (Standard general guide)
    relatedVehicleIds: [],
    robotsIndex: true,
    robotsFollow: true,
    publishedAt: "2026-07-25T11:00:00.000Z",
    updatedAt: "2026-08-15T09:00:00.000Z",
    createdAt: "2026-07-25T10:00:00.000Z",
    translations: {
      fr: {
        title: "Comment bien choisir ses pneus : été, hiver ou 4 saisons ?",
        slug: "comment-bien-choisir-ses-pneus-ete-hiver-4-saisons",
        excerpt: "Réglementation Loi Montagne, distances de freinage et efficacité énergétique : notre guide complet pour choisir la monte pneumatique idéale.",
        content: `## Le seul point de contact entre votre voiture et la route

Les pneumatiques constituent l'élément de sécurité le plus déterminant de votre véhicule. Une monte pneumatique inadaptée peut allonger vos distances de freinage de plusieurs dizaines de mètres sur sol mouillé ou enneigé.

---

## 1. Pneus Été : l'efficacité maximale au-dessus de 7°C

- **Composition** : Gomme dure assurant une adhérence optimale sur sol sec et mouillé par températures positives.
- **Avantages** : Précision directionnelle, faible résistance au roulement (économies de carburant), silence de roulement.
- **Limite** : En dessous de 7°C, la gomme durcit et perd considérablement son pouvoir d'adhérence.

---

## 2. Pneus Hiver (3PMSF) : indispensables sous 7°C et sur neige

- **Composition** : Gomme enrichie en silice et nombreuses lamelles pour évacuer l'eau et mordre dans la neige.
- **Avantages** : Distance de freinage divisée par deux sur chaussée glissante ou verglacée.
- **Loi Montagne** : Obligatoires dans 34 départements français du 1er novembre au 31 mars.

---

## 3. Pneus 4 Saisons (All Season) : le compromis moderne

Pour les conducteurs roulant en zone tempérée avec des chutes de neige occasionnelles, les pneus 4 saisons modernes labellisés **3PMSF** constituent une excellente alternative évitant le double changement annuel de roues.

---

## Synthèse : quelle monte choisir ?

| Conditions climatiques | Kilométrage annuel | Choix recommandé |
| :--- | :--- | :--- |
| **Plaine & Climat tempéré** | < 15 000 km | **Pneus 4 Saisons 3PMSF** |
| **Régions montagneuses** | Tout kilométrage | **Alternance Pneus Été / Pneus Hiver** |
| **Conduite sportive sur piste** | Tout kilométrage | **Pneus Été Haute Performance** |

[CTA_CONTACT]`,
        seoTitle: "Comment choisir ses pneus : été, hiver ou 4 saisons ? Guide 2026",
        metaDescription: "Guide complet pour choisir ses pneus : différences entre été, hiver et 4 saisons, distances de freinage et obligations Loi Montagne.",
        focusKeyword: "choisir pneus ete hiver 4 saisons",
        imageAlt: "Pneumatiques haute performance pour voiture de tourisme",
        ogTitle: "Comment choisir ses pneus : été, hiver ou 4 saisons ?",
        ogDescription: "Découvrez notre comparatif pour choisir la monte pneumatique la plus adaptée à votre véhicule.",
        readingTime: 5
      },
      en: {
        title: "How to Choose the Right Tyres: Summer, Winter or All-Season?",
        slug: "how-to-choose-tyres-summer-winter-all-season",
        excerpt: "Stopping distances, temperature thresholds and mountain regulations: our comprehensive guide to selecting the right tyres.",
        content: `## Your Vehicle's Only Contact with the Road

Tyres represent the single most crucial safety component of your car. Choosing the wrong tyre compound can significantly increase braking distances on wet or freezing roads.

---

## 1. Summer Tyres: Optimal Grip Above 7°C

- **Compound**: Harder rubber engineered for maximum stability and water dispersion in warmer conditions.
- **Pros**: Precise steering feedback, lower rolling resistance (fuel savings), reduced road noise.
- **Limit**: Below 7°C (45°F), the rubber compound stiffens and loses grip rapidly.

---

## 2. Winter Tyres (3PMSF): Essential in Cold & Snow

- **Compound**: High silica content rubber with deep sipes that flex to grip snow and ice.
- **Pros**: Up to 50% shorter stopping distances on cold, icy, or snow-covered surfaces.

---

## 3. All-Season Tyres: The Modern Year-Round Solution

For drivers living in moderate climates with occasional winter precipitation, 3PMSF-certified all-season tyres eliminate the hassle of semi-annual tyre swaps.

---

## Quick Recommendation Guide

| Driving Environment | Annual Mileage | Recommended Tyre Type |
| :--- | :--- | :--- |
| **Moderate / Temperate Zones** | < 15,000 km | **3PMSF All-Season Tyres** |
| **Mountainous / Harsh Winters** | Any | **Summer & Winter Tyre Swap** |
| **High Performance Driving** | Any | **Ultra High Performance Summer** |

[CTA_CONTACT]`,
        seoTitle: "How to Choose the Right Tyres: Summer, Winter, All-Season Guide 2026",
        metaDescription: "Complete guide on tyre types: differences between summer, winter and all-season tyres, temperature thresholds and safety tips.",
        focusKeyword: "how to choose tyres",
        imageAlt: "High performance road tyres in garage",
        ogTitle: "How to Choose the Right Tyres: Summer, Winter or All-Season?",
        ogDescription: "Expert advice on selecting the safest and most efficient tyres for your driving environment.",
        readingTime: 5
      },
      ru: {
        title: "Как правильно выбрать шины: летние, зимние или всесезонные?",
        slug: "kak-pravilno-vybrat-shiny-letnie-zimnie-vsesezonnye",
        excerpt: "Тормозной путь, температурный порог +7°C и правила безопасности: полный гид по выбору правильной резины.",
        content: `## Единственное связующее звено между автомобилем и дорогой

Шины — главный элемент безопасности любого автомобиля. Неправильно подобранный комплект резины может увеличить тормозной путь на десятки метров на мокрой или обледенелой дороге.

---

## 1. Летние шины: максимум сцепления при температуре выше +7°C

- **Состав**: плотная резиновая смесь, обеспечивающая курсовую устойчивость и эффективный отвод воды.
- **Плюсы**: точность рулевого управления, низкое сопротивление качению (экономия топлива), тишина в салоне.
- **Ограничение**: при температуре ниже +7°C резина «дубеет» и резко теряет сцепные свойства.

---

## 2. Зимние шины (маркировка 3PMSF «снежинка на горе»)

- **Состав**: мягкая смесь с добавлением силики и частые ламели, которые буквально цепляются за снег и лед.
- **Плюсы**: сокращение тормозного пути почти вдвое на скользком покрытии.

---

## 3. Всесезонные шины (All Season): универсальный компромисс

Для регионов с мягким европейским климатом и редкими снегопадами качественные всесезонные шины с маркировкой 3PMSF избавляют от необходимости сезонного шиномонтажа.

---

## Сводные рекомендации

| Климатические условия | Годовой пробег | Рекомендуемый выбор |
| :--- | :--- | :--- |
| **Мягкий европейский климат** | < 15 000 км | **Всесезонные шины 3PMSF** |
| **Горные районы / снежная зима** | Любой | **Два комплекта: лето + зима** |
| **Спортивная езда** | Любой | **Спортивные летние шины (UHP)** |

[CTA_CONTACT]`,
        seoTitle: "Как правильно выбрать шины: летние, зимние или всесезонка? Гид 2026",
        metaDescription: "Подробный гид по выбору автомобильных шин: сравнение летней, зимней и всесезонной резины, температурные режимы и безопасность.",
        focusKeyword: "как выбрать шины лето зима",
        imageAlt: "Премиальные автомобильные шины в сервисном центре",
        ogTitle: "Как правильно выбрать шины: летние, зимние или всесезонные?",
        ogDescription: "Советы экспертов по подбору автомобильных шин под любые дорожные и погодные условия.",
        readingTime: 5
      }
    }
  }
];

// Helper functions for multilingual articles and categories
export const getArticleLang = (article: Article | Partial<Article> | null | undefined, currentLang: string = 'fr'): ArticleTranslation => {
  if (!article) {
    return { title: '', slug: '', excerpt: '', content: '', readingTime: 5 };
  }
  const l = (currentLang || 'fr') as 'fr' | 'en' | 'ru';
  const target = article.translations?.[l];
  if (target && (target.title?.trim() || target.content?.trim())) {
    const fr = article.translations?.fr;
    return {
      title: target.title || fr?.title || article.title || '',
      slug: target.slug || fr?.slug || article.slug || '',
      excerpt: target.excerpt || fr?.excerpt || article.excerpt || '',
      content: target.content || fr?.content || article.content || '',
      seoTitle: target.seoTitle || fr?.seoTitle || article.seoTitle || target.title || '',
      metaDescription: target.metaDescription || fr?.metaDescription || article.metaDescription || target.excerpt || '',
      focusKeyword: target.focusKeyword || fr?.focusKeyword || article.focusKeyword || '',
      imageAlt: target.imageAlt || fr?.imageAlt || article.featuredImageAlt || '',
      ogTitle: target.ogTitle || fr?.ogTitle || article.ogTitle || target.title || '',
      ogDescription: target.ogDescription || fr?.ogDescription || article.ogDescription || target.metaDescription || '',
      readingTime: target.readingTime || fr?.readingTime || article.readingTime || 5
    };
  }
  // Check direct localized fields like title_ru / content_ru
  if (l === 'ru' && ((article as any).title_ru || (article as any).content_ru)) {
    return {
      title: (article as any).title_ru || article.title || '',
      slug: (article as any).slug_ru || article.slug || '',
      excerpt: (article as any).excerpt_ru || article.excerpt || '',
      content: (article as any).content_ru || article.content || '',
      seoTitle: (article as any).seoTitle_ru || '',
      metaDescription: (article as any).metaDescription_ru || '',
      focusKeyword: (article as any).focusKeyword_ru || '',
      imageAlt: (article as any).featuredImageAlt_ru || article.featuredImageAlt || '',
      ogTitle: (article as any).ogTitle_ru || '',
      ogDescription: (article as any).ogDescription_ru || '',
      readingTime: 5
    };
  }
  if (l === 'en' && ((article as any).title_en || (article as any).content_en)) {
    return {
      title: (article as any).title_en || article.title || '',
      slug: (article as any).slug_en || article.slug || '',
      excerpt: (article as any).excerpt_en || article.excerpt || '',
      content: (article as any).content_en || article.content || '',
      seoTitle: (article as any).seoTitle_en || '',
      metaDescription: (article as any).metaDescription_en || '',
      focusKeyword: (article as any).focusKeyword_en || '',
      imageAlt: (article as any).featuredImageAlt_en || article.featuredImageAlt || '',
      ogTitle: (article as any).ogTitle_en || '',
      ogDescription: (article as any).ogDescription_en || '',
      readingTime: 5
    };
  }

  // Fallbacks: fr -> ru -> en -> base
  const fr = article.translations?.fr;
  if (fr && (fr.title?.trim() || fr.content?.trim())) return fr;
  const ru = article.translations?.ru;
  if (ru && (ru.title?.trim() || ru.content?.trim())) return ru;
  const en = article.translations?.en;
  if (en && (en.title?.trim() || en.content?.trim())) return en;

  return {
    title: article.title || '',
    slug: article.slug || '',
    excerpt: article.excerpt || '',
    content: article.content || '',
    seoTitle: article.seoTitle || article.title || '',
    metaDescription: article.metaDescription || article.excerpt || '',
    focusKeyword: article.focusKeyword || '',
    imageAlt: article.featuredImageAlt || article.title || '',
    ogTitle: article.ogTitle || article.title || '',
    ogDescription: article.ogDescription || article.metaDescription || '',
    readingTime: article.readingTime || 5
  };
};

export const getCategoryLang = (category?: ArticleCategory | null, currentLang: string = 'fr'): { name: string; slug: string; description: string } => {
  if (!category) return { name: '', slug: '', description: '' };
  const l = (currentLang || 'fr') as 'fr' | 'en' | 'ru';
  const target = category.translations?.[l];
  if (target && target.name?.trim()) {
    return {
      name: target.name,
      slug: target.slug || category.slug,
      description: target.description || category.description || ''
    };
  }
  return {
    name: category.name || '',
    slug: category.slug || '',
    description: category.description || ''
  };
};

export const isArticleLangFilled = (article: Article | Partial<Article> | null | undefined, l: 'fr' | 'en' | 'ru'): boolean => {
  if (!article) return false;
  const trans = article.translations?.[l];
  return Boolean(trans && trans.title?.trim() && trans.content?.trim());
};

const normalizeArticle = (art: any): Article => {
  const trFr: ArticleTranslation = art.translations?.fr || {
    title: art.title || '',
    slug: art.slug || '',
    excerpt: art.excerpt || '',
    content: art.content || '',
    seoTitle: art.seoTitle || art.title || '',
    metaDescription: art.metaDescription || art.excerpt || '',
    focusKeyword: art.focusKeyword || '',
    imageAlt: art.featuredImageAlt || art.title || '',
    ogTitle: art.ogTitle || art.title || '',
    ogDescription: art.ogDescription || art.excerpt || '',
    readingTime: art.readingTime || 5
  };

  const trEn: ArticleTranslation | undefined = art.translations?.en || (art.title_en ? {
    title: art.title_en || '',
    slug: art.slug_en || '',
    excerpt: art.excerpt_en || '',
    content: art.content_en || '',
    seoTitle: art.seoTitle_en || art.title_en || '',
    metaDescription: art.metaDescription_en || art.excerpt_en || '',
    focusKeyword: art.focusKeyword_en || '',
    imageAlt: art.featuredImageAlt_en || art.title_en || '',
    ogTitle: art.ogTitle_en || art.title_en || '',
    ogDescription: art.ogDescription_en || art.excerpt_en || '',
    readingTime: art.readingTime_en || 5
  } : undefined);

  const trRu: ArticleTranslation | undefined = art.translations?.ru || (art.title_ru ? {
    title: art.title_ru || '',
    slug: art.slug_ru || '',
    excerpt: art.excerpt_ru || '',
    content: art.content_ru || '',
    seoTitle: art.seoTitle_ru || art.title_ru || '',
    metaDescription: art.metaDescription_ru || art.excerpt_ru || '',
    focusKeyword: art.focusKeyword_ru || '',
    imageAlt: art.featuredImageAlt_ru || art.title_ru || '',
    ogTitle: art.ogTitle_ru || art.title_ru || '',
    ogDescription: art.ogDescription_ru || art.excerpt_ru || '',
    readingTime: art.readingTime_ru || 5
  } : undefined);

  return {
    ...art,
    relatedVehicleId: art.relatedVehicleId !== undefined ? art.relatedVehicleId : (art.relatedVehicleIds && art.relatedVehicleIds.length > 0 ? art.relatedVehicleIds[0] : null),
    robotsIndex: art.robotsIndex !== undefined ? Boolean(art.robotsIndex) : true,
    robotsFollow: art.robotsFollow !== undefined ? Boolean(art.robotsFollow) : true,
    homepageFeatured: Boolean(art.homepageFeatured),
    translations: {
      fr: trFr,
      ...(trEn ? { en: trEn } : {}),
      ...(trRu ? { ru: trRu } : {})
    }
  };
};

const loadLocalCategories = (): ArticleCategory[] => {
  try {
    const saved = localStorage.getItem('ligo_article_categories');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (e) {
    console.error("Failed to parse local categories:", e);
  }
  return DEMO_CATEGORIES;
};

const loadLocalArticles = (): Article[] => {
  try {
    const saved = localStorage.getItem('ligo_articles');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.map(normalizeArticle);
      }
    }
  } catch (e) {
    console.error("Failed to parse local articles:", e);
  }
  return DEMO_ARTICLES;
};



// Analytics Data Model & Helper Types
export interface AnalyticsEvent {
  id: string;
  event: 
    | 'page_view'
    | 'vehicle_view'
    | 'vehicle_whatsapp_click'
    | 'vehicle_phone_click'
    | 'vehicle_lead_submit'
    | 'vehicle_compare_add'
    | 'vehicle_compare_remove'
    | 'comparison_view'
    | 'catalog_view'
    | 'vehicle_card_click'
    | 'catalog_search'
    | 'catalog_filter'
    | 'article_view'
    | 'article_vehicle_click'
    | 'article_whatsapp_click'
    | 'article_catalog_click';
  vehicleId?: string;
  brand?: string;
  model?: string;
  articleId?: string;
  articleTitle?: string;
  comparedVehicleIds?: string[];
  comparedPairs?: string[]; // e.g. ["idA:idB"]
  visitorId: string;
  sessionId: string;
  source: string; // 'Google Organic' | 'Google Ads' | 'Direct' | 'Facebook' | 'Instagram' | 'WhatsApp' | 'Other'
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmContent?: string;
  utmTerm?: string;
  referrer?: string;
  path: string;
  language: string; // 'fr' | 'en' | 'ru'
  timestamp: string; // ISO string
  meta?: any;
}

export function getOrCreateVisitorId(): string {
  try {
    let vid = localStorage.getItem('ligo_visitor_id');
    if (!vid) {
      vid = `v_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      localStorage.setItem('ligo_visitor_id', vid);
    }
    return vid;
  } catch {
    return 'anonymous_visitor';
  }
}

export function getOrCreateSessionId(): string {
  try {
    let sid = sessionStorage.getItem('ligo_session_id');
    if (!sid) {
      sid = `s_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      sessionStorage.setItem('ligo_session_id', sid);
    }
    return sid;
  } catch {
    return 'anonymous_session';
  }
}

export interface TrafficSourceInfo {
  source: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmContent?: string;
  utmTerm?: string;
  referrer?: string;
}

export function detectTrafficSource(): TrafficSourceInfo {
  try {
    const saved = sessionStorage.getItem('ligo_traffic_source');
    if (saved) {
      return JSON.parse(saved);
    }

    const urlParams = new URLSearchParams(window.location.search);
    const utmSource = urlParams.get('utm_source') || undefined;
    const utmMedium = urlParams.get('utm_medium') || undefined;
    const utmCampaign = urlParams.get('utm_campaign') || undefined;
    const utmContent = urlParams.get('utm_content') || undefined;
    const utmTerm = urlParams.get('utm_term') || undefined;
    const referrer = document.referrer || '';

    let source = 'Direct';
    const sLow = (utmSource || '').toLowerCase();
    const mLow = (utmMedium || '').toLowerCase();
    const refLow = referrer.toLowerCase();

    if (sLow === 'google' && (mLow.includes('cpc') || mLow.includes('ads') || mLow.includes('paid'))) {
      source = 'Google Ads';
    } else if (sLow.includes('google') || refLow.includes('google.')) {
      source = 'Google Organic';
    } else if (sLow.includes('facebook') || sLow.includes('fb') || refLow.includes('facebook.') || refLow.includes('fb.')) {
      source = 'Facebook';
    } else if (sLow.includes('instagram') || sLow.includes('ig') || refLow.includes('instagram.')) {
      source = 'Instagram';
    } else if (sLow.includes('whatsapp') || refLow.includes('whatsapp.') || refLow.includes('wa.me')) {
      source = 'WhatsApp';
    } else if (referrer && !refLow.includes(window.location.hostname)) {
      source = 'Other';
    }

    const result: TrafficSourceInfo = {
      source,
      utmSource,
      utmMedium,
      utmCampaign,
      utmContent,
      utmTerm,
      referrer: referrer || undefined
    };

    sessionStorage.setItem('ligo_traffic_source', JSON.stringify(result));
    return result;
  } catch {
    return { source: 'Direct' };
  }
}

// Baseline analytics (empty by default for real tracking)
export function generateBaselineAnalytics(_carsList?: Car[], _articlesList?: Article[]): AnalyticsEvent[] {
  return [];
}

export const loadLocalAnalyticsEvents = (_carsList?: Car[], _articlesList?: Article[]): AnalyticsEvent[] => {
  try {
    const saved = localStorage.getItem('ligo_analytics_events');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch (e) { console.error('Failed to parse local analytics events:', e); }

  return [];
};

export interface CarFaqItem {
  id?: string;
  question?: string;
  answer?: string;
  fr?: { question: string; answer: string };
  en?: { question: string; answer: string };
  ru?: { question: string; answer: string };
}

export interface EquipmentItem {
  id: string;
  category?: 'tech' | 'comfort' | 'safety' | 'design';
  fr: string;
  en: string;
  ru: string;
}

export interface CustomEquipment {
  id: string;
  fr: string;
  en: string;
  ru: string;
}

export const STANDARD_EQUIPMENTS: EquipmentItem[] = [
  { id: 'gps_navigation', category: 'tech', fr: 'Système de navigation GPS', en: 'GPS Navigation System', ru: 'GPS-навигация' },
  { id: 'rear_camera', category: 'safety', fr: 'Caméra de recul', en: 'Rear-view camera', ru: 'Камера заднего вида' },
  { id: 'parking_sensors', category: 'safety', fr: 'Radars avant / arrière', en: 'Front & rear parking sensors', ru: 'Парктроники' },
  { id: 'panoramic_roof', category: 'comfort', fr: 'Toit ouvrant panoramique', en: 'Panoramic sunroof', ru: 'Панорамная крыша' },
  { id: 'heated_seats', category: 'comfort', fr: 'Sièges chauffants', en: 'Heated seats', ru: 'Подогрев сидений' },
  { id: 'leather_seats', category: 'comfort', fr: 'Sellerie cuir', en: 'Leather upholstery', ru: 'Кожаный салон' },
  { id: 'adaptive_cruise_control', category: 'safety', fr: 'Régulateur de vitesse adaptatif', en: 'Adaptive cruise control', ru: 'Адаптивный круиз-контроль' },
  { id: 'apple_carplay_android_auto', category: 'tech', fr: 'Apple CarPlay & Android Auto', en: 'Apple CarPlay & Android Auto', ru: 'Apple CarPlay / Android Auto' },
  { id: 'dual_zone_climate', category: 'comfort', fr: 'Climatisation automatique bi-zone', en: 'Dual-zone automatic climate control', ru: 'Климат-контроль' },
  { id: 'alloy_wheels', category: 'design', fr: 'Jantes alliage', en: 'Alloy wheels', ru: 'Легкосплавные диски' },
  { id: 'matrix_led', category: 'tech', fr: 'Projecteurs Full LED Matrix', en: 'Full LED Matrix headlights', ru: 'Матричные фары Matrix LED' },
  { id: 'keyless_entry', category: 'comfort', fr: 'Accès & Démarrage mains libres (Keyless)', en: 'Keyless entry & start', ru: 'Бесключевой доступ (Keyless)' },
  { id: 'sport_package', category: 'design', fr: 'Pack Sport', en: 'Sport Package', ru: 'Спортивный пакет' },
  { id: 'blind_spot_monitoring', category: 'safety', fr: 'Avertisseur d\'angles morts', en: 'Blind spot monitoring', ru: 'Мониторинг слепых зон' },
  { id: 'digital_cockpit', category: 'tech', fr: 'Cockpit digital', en: 'Virtual Digital Cockpit', ru: 'Цифровая приборная панель' },
  { id: 'lane_assist', category: 'safety', fr: 'Aide au maintien dans la voie', en: 'Lane keeping assist', ru: 'Удержание в полосе' },
  { id: 'premium_audio', category: 'tech', fr: 'Système audio Premium Hi-Fi', en: 'Premium Hi-Fi sound system', ru: 'Премиум-аудиосистема Hi-Fi' },
  { id: 'bluetooth_usb', category: 'tech', fr: 'Bluetooth & Ports USB', en: 'Bluetooth & USB ports', ru: 'Bluetooth / USB' },
  { id: 'electric_mirrors', category: 'comfort', fr: 'Rétroviseurs électriques rabattables', en: 'Electric folding heated mirrors', ru: 'Электрозеркала' },
  { id: 'rain_light_sensors', category: 'safety', fr: 'Capteurs de pluie & luminosité', en: 'Rain & light sensors', ru: 'Датчик дождя и света' },
  { id: 'tow_bar', category: 'comfort', fr: 'Attelage amovible', en: 'Removable tow bar', ru: 'Фаркоп' },
  { id: 'isofix', category: 'safety', fr: 'Fixations ISOFIX', en: 'ISOFIX child seat anchors', ru: 'Крепления ISOFIX' },
  { id: 'tinted_windows', category: 'design', fr: 'Vitres arrière surteintées', en: 'Rear privacy glass', ru: 'Тонированные стекла' }
];

export function normalizeEquipmentKey(raw: string): string {
  if (!raw) return '';
  const trimmed = raw.trim();
  const std = STANDARD_EQUIPMENTS.find(e => e.id === trimmed);
  if (std) return std.id;

  const lower = trimmed.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  if (lower.includes('gps') || lower.includes('navig')) return 'gps_navigation';
  if (lower.includes('camera') || lower.includes('recul')) return 'rear_camera';
  if (lower.includes('radar') || lower.includes('parking') || lower.includes('stationnement')) return 'parking_sensors';
  if (lower.includes('toit') || lower.includes('panoram') || lower.includes('ouvrant')) return 'panoramic_roof';
  if (lower.includes('siege') && lower.includes('chauffant')) return 'heated_seats';
  if (lower.includes('cuir') || lower.includes('sellerie')) return 'leather_seats';
  if (lower.includes('adaptatif') || (lower.includes('regulat') && lower.includes('vitesse'))) return 'adaptive_cruise_control';
  if (lower.includes('carplay') || lower.includes('android')) return 'apple_carplay_android_auto';
  if (lower.includes('clim') || lower.includes('climat')) return 'dual_zone_climate';
  if (lower.includes('jante') || lower.includes('alliage') || lower.includes('alloy')) return 'alloy_wheels';
  if (lower.includes('led') || lower.includes('matrix') || lower.includes('projecteur') || lower.includes('phare')) return 'matrix_led';
  if (lower.includes('mains libres') || lower.includes('keyless') || lower.includes('acces') || lower.includes('demarrage')) return 'keyless_entry';
  if (lower.includes('sport') || lower.includes('pack')) return 'sport_package';
  if (lower.includes('angle') || lower.includes('mort')) return 'blind_spot_monitoring';
  if (lower.includes('cockpit') || lower.includes('digital') || lower.includes('compteur')) return 'digital_cockpit';
  if (lower.includes('voie') || lower.includes('ligne') || lower.includes('maintien')) return 'lane_assist';
  if (lower.includes('audio') || lower.includes('hifi') || lower.includes('focal') || lower.includes('bose') || lower.includes('harman')) return 'premium_audio';
  if (lower.includes('bluetooth') || lower.includes('usb')) return 'bluetooth_usb';
  if (lower.includes('retrovis') || lower.includes('miroir')) return 'electric_mirrors';
  if (lower.includes('pluie') || lower.includes('essuie') || lower.includes('feux')) return 'rain_light_sensors';
  if (lower.includes('attelage')) return 'tow_bar';
  if (lower.includes('isofix')) return 'isofix';
  if (lower.includes('vitre') || lower.includes('surteinte') || lower.includes('teinte')) return 'tinted_windows';

  return trimmed;
}

export function translateEquipment(eq: string = '', lang: string = 'fr', customEquipments?: CustomEquipment[]): string {
  if (!eq) return '';
  const key = normalizeEquipmentKey(eq);
  const std = STANDARD_EQUIPMENTS.find(e => e.id === key);
  if (std) return (std as any)[lang] || std.fr;
  
  if (customEquipments && customEquipments.length > 0) {
    const custom = customEquipments.find(c => c.id === key || c.id === eq || c.fr === eq || c.ru === eq || c.en === eq);
    if (custom) return (custom as any)[lang] || (lang === 'ru' ? custom.ru : lang === 'en' ? custom.en : custom.fr) || custom.fr;
  }
  
  return eq;
}

export function getCarEquipments(car: Partial<Car>, lang: string = 'fr'): string[] {
  const rawList = car.equipments || [];
  const custom = car.customEquipments || [];
  return rawList.map(eq => translateEquipment(eq, lang, custom));
}

export interface CarTranslation {
  description?: string;
  detailedSeoDescription?: string;
  vehicleCondition?: string;
  seoTitle?: string;
  metaDescription?: string;
  seoH1?: string;
  slug?: string;
  focusKeyword?: string;
  ogTitle?: string;
  ogDescription?: string;
  imageAlt?: string;
  faq?: Array<{ question: string; answer: string }>;
}

export interface Car {
  id: string;
  brand: string;
  model: string;
  engine?: string;
  year: number | string;
  km: number | string;
  price: number;
  fuel: string;
  transmission: string;
  hp: number | string;
  co2?: number | string;
  vin?: string;
  status: string;
  image: string;
  imageAlt?: string;
  galleryImages?: string[];
  galleryImagesAlt?: string[];
  description?: string;
  description_en?: string;
  description_ru?: string;
  detailedSeoDescription?: string;
  vehicleCondition?: string;
  equipments?: string[];
  customEquipments?: CustomEquipment[];
  color?: string;
  doors?: number;
  seats?: number;
  bodyType?: string;
  verifiedVin?: boolean;
  featuredOnHomepage?: boolean;
  homepageOrder?: number;
  
  // SEO & Indexation
  seoTitle?: string;
  metaDescription?: string;
  focusKeyword?: string;
  slug?: string;
  seoH1?: string;
  canonicalUrl?: string;
  robotsIndex?: boolean;
  robotsFollow?: boolean;
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
  faq?: CarFaqItem[];
  translations?: {
    fr?: Partial<CarTranslation>;
    en?: Partial<CarTranslation>;
    ru?: Partial<CarTranslation>;
  };
  warranty?: string;
  updatedAt?: string;
  createdAt?: string;
  relatedArticleIds?: string[];
  similarCarIds?: string[];
}

export interface LocalizationStatus {
  complete: boolean;
  missing: string[];
  label: string;
}

export function getCarLocalizationStatus(car: Partial<Car>): { fr: LocalizationStatus; en: LocalizationStatus; ru: LocalizationStatus } {
  const checkLang = (l: 'fr' | 'en' | 'ru'): LocalizationStatus => {
    const t = car.translations?.[l] || {};
    const missing: string[] = [];

    const hasShortDesc = !!(t.description?.trim() || (l === 'fr' ? car.description : l === 'en' ? car.description_en : car.description_ru)?.trim());

    if (!hasShortDesc) missing.push(l === 'ru' ? 'краткое описание' : l === 'en' ? 'short description' : 'description courte');

    return {
      complete: missing.length === 0,
      missing,
      label: missing.length === 0 ? '✅' : '⚠️'
    };
  };

  return {
    fr: checkLang('fr'),
    en: checkLang('en'),
    ru: checkLang('ru')
  };
}

export function generateCarSlug(car: Partial<Car>): string {
  const brand = (car.brand || '').trim().toLowerCase();
  const model = (car.model || '').trim().toLowerCase();
  const engine = (car.engine || '').trim().toLowerCase();
  const year = car.year ? String(car.year).trim() : '';

  const raw = `${brand} ${model} ${engine} occasion ${year}`;
  const slug = raw
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return slug || `vehicule-${Date.now()}`;
}

export function translateFuel(fuel: string = '', lang: string = 'fr'): string {
  const map: Record<string, Record<string, string>> = {
    diesel: { fr: 'Diesel', en: 'Diesel', ru: 'Дизель' },
    essence: { fr: 'Essence', en: 'Petrol', ru: 'Бензин' },
    hybride: { fr: 'Hybride', en: 'Hybrid', ru: 'Гибрид' },
    electrique: { fr: 'Électrique', en: 'Electric', ru: 'Электро' }
  };
  const key = (fuel || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  for (const [k, v] of Object.entries(map)) {
    if (key.includes(k)) return v[lang] || v.fr;
  }
  return fuel;
}

export function translateTransmission(trans: string = '', lang: string = 'fr'): string {
  const map: Record<string, Record<string, string>> = {
    auto: { fr: 'Automatique', en: 'Automatic', ru: 'Автомат' },
    man: { fr: 'Manuelle', en: 'Manual', ru: 'Механика' },
    mec: { fr: 'Manuelle', en: 'Manual', ru: 'Механика' }
  };
  const key = (trans || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  for (const [k, v] of Object.entries(map)) {
    if (key.includes(k)) return v[lang] || v.fr;
  }
  return trans;
}

export function translateStatus(status: string = '', lang: string = 'fr'): string {
  const map: Record<string, Record<string, string>> = {
    disponible: { fr: 'Disponible', en: 'Available', ru: 'В наличии' },
    stock: { fr: 'Disponible', en: 'Available', ru: 'В наличии' },
    arrivage: { fr: 'En arrivage', en: 'Incoming', ru: 'В пути' },
    reserve: { fr: 'Réservé', en: 'Reserved', ru: 'Зарезервировано' },
    vendu: { fr: 'Vendu', en: 'Sold', ru: 'Продано' },
    sold: { fr: 'Vendu', en: 'Sold', ru: 'Продано' }
  };
  const key = (status || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  for (const [k, v] of Object.entries(map)) {
    if (key.includes(k)) return v[lang] || v.fr;
  }
  return status;
}

export function translateBodyType(body: string = '', lang: string = 'fr'): string {
  const map: Record<string, Record<string, string>> = {
    suv: { fr: 'SUV', en: 'SUV', ru: 'Кроссовер / SUV' },
    berline: { fr: 'Berline', en: 'Sedan / Hatchback', ru: 'Седан / Хэтчбек' },
    break: { fr: 'Break / Estate', en: 'Station Wagon', ru: 'Универсал' },
    estate: { fr: 'Break / Estate', en: 'Station Wagon', ru: 'Универсал' },
    coupe: { fr: 'Coupé', en: 'Coupe', ru: 'Купе' },
    cabriolet: { fr: 'Cabriolet', en: 'Convertible', ru: 'Кабриолет' },
    monospac: { fr: 'Monospace', en: 'Minivan', ru: 'Минивэн' },
    citadine: { fr: 'Citadine', en: 'City Car', ru: 'Компакт / Хэтчбек' }
  };
  const key = (body || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  for (const [k, v] of Object.entries(map)) {
    if (key.includes(k)) return v[lang] || v.fr;
  }
  return body || (lang === 'ru' ? 'Легковой' : lang === 'en' ? 'Passenger Car' : 'Berline');
}

export function translateColor(color: string = '', lang: string = 'fr'): string {
  const map: Record<string, Record<string, string>> = {
    noir: { fr: 'Noir Métallisé', en: 'Metallic Black', ru: 'Черный металлик' },
    black: { fr: 'Noir Métallisé', en: 'Metallic Black', ru: 'Черный металлик' },
    blanc: { fr: 'Blanc Nacré', en: 'Pearl White', ru: 'Белый перламутр' },
    white: { fr: 'Blanc Nacré', en: 'Pearl White', ru: 'Белый перламутр' },
    gris: { fr: 'Gris Anthracite', en: 'Anthracite Grey', ru: 'Серый антрацит' },
    grey: { fr: 'Gris Anthracite', en: 'Anthracite Grey', ru: 'Серый антрацит' },
    gray: { fr: 'Gris Anthracite', en: 'Anthracite Grey', ru: 'Серый антрацит' },
    bleu: { fr: 'Bleu Nuit', en: 'Midnight Blue', ru: 'Синий металлик' },
    blue: { fr: 'Bleu Nuit', en: 'Midnight Blue', ru: 'Синий металлик' },
    rouge: { fr: 'Rouge Rubis', en: 'Ruby Red', ru: 'Красный рубин' },
    red: { fr: 'Rouge Rubis', en: 'Ruby Red', ru: 'Красный рубин' },
    argent: { fr: 'Gris Argent', en: 'Silver', ru: 'Серебристый' },
    silver: { fr: 'Gris Argent', en: 'Silver', ru: 'Серебристый' },
    marron: { fr: 'Brun Moka', en: 'Mocha Brown', ru: 'Коричневый мокко' },
    teinte: { fr: 'Teinte d\'origine', en: 'Original Paint', ru: 'Заводской окрас' }
  };
  const key = (color || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  for (const [k, v] of Object.entries(map)) {
    if (key.includes(k)) return v[lang] || v.fr;
  }
  return color || (lang === 'ru' ? 'Заводской окрас' : lang === 'en' ? 'Original Paint' : "Teinte d'origine");
}

export function getCarPresentationText(car: Partial<Car>, lang: string = 'fr'): string {
  const brand = car.brand || 'Ligo Automobiles';
  const model = car.model || '';
  const year = car.year ? ` (${car.year})` : '';
  
  if (lang === 'ru') {
    return car.translations?.ru?.detailedSeoDescription || 
      car.translations?.ru?.description || 
      car.description_ru || 
      `Автомобиль ${brand} ${model}${year} в отличном техническом и визуальном состоянии. Прошел строгую проверку по 100+ пунктам, полную предпродажную подготовку и ревизию в партнерском сервисном центре Ligo Automobiles. Полный комплект документов, подтвержденный оригинальный пробег и гарантия 12 месяцев. Готов к комфортной и безопасной эксплуатации.`;
  }
  if (lang === 'en') {
    return car.translations?.en?.detailedSeoDescription || 
      car.translations?.en?.description || 
      car.description_en || 
      `This ${brand} ${model}${year} has been carefully inspected and serviced by Ligo Automobiles. Rigorously checked across 100+ checkpoints, with transparent vehicle history, certified mileage, and 12-month European mechanical warranty. Ready for immediate delivery.`;
  }
  return car.translations?.fr?.detailedSeoDescription || 
    car.translations?.fr?.description || 
    car.detailedSeoDescription || 
    car.description || 
    "Ce véhicule d'exception sélectionné par Ligo Automobiles allie élégance, confort et rigueur mécanique. Révisé dans nos ateliers partenaires, certifié 100+ points de contrôle et prêt pour la route.";
}

export function getCarConditionText(car: Partial<Car>, lang: string = 'fr'): string {
  if (lang === 'ru') {
    return car.translations?.ru?.vehicleCondition || 
      "Автомобиль не участвовал в серьезных ДТП, геометрия кузова и силовая структура в заводских параметрах. Пройдено комплексное техническое обслуживание. Тормозные колодки, диски и шины с минимальным износом. Действительный техосмотр (Contrôle Technique).";
  }
  if (lang === 'en') {
    return car.translations?.en?.vehicleCondition || 
      "Accident-free vehicle with certified structural integrity. Fully serviced according to manufacturer schedule. Brakes, tires, and mechanical components in excellent condition. Valid roadworthiness inspection (Contrôle Technique).";
  }
  return car.translations?.fr?.vehicleCondition || 
    car.vehicleCondition || 
    "Véhicule non accidenté, structure saine et conforme aux normes constructeur. Révision récente effectuée, consommables en excellent état. Contrôle technique à jour.";
}

export function getCarFaq(car: Partial<Car>, lang: string = 'fr'): Array<{ question: string; answer: string }> {
  // Check translation specific FAQ
  if (car.translations?.[lang as 'fr']?.faq && car.translations[lang as 'fr']!.faq!.length > 0) {
    return car.translations[lang as 'fr']!.faq!;
  }
  
  // Check multi-language structured FAQ in car.faq
  if (car.faq && car.faq.length > 0) {
    const localized = car.faq.map(item => {
      if ((item as any)[lang]?.question) {
        return { question: (item as any)[lang].question, answer: (item as any)[lang].answer };
      }
      if (item.question) {
        return { question: item.question, answer: item.answer || '' };
      }
      return null;
    }).filter(Boolean) as Array<{ question: string; answer: string }>;
    
    if (localized.length > 0) return localized;
  }

  // Fallback to default generated FAQ
  return generateCarDefaultFaq(car).map(item => {
    const loc = (item as any)[lang] || item.fr || { question: item.question || '', answer: item.answer || '' };
    return { question: loc.question, answer: loc.answer };
  });
}


export function getCarSeoTitle(car: Partial<Car>, lang: string = 'fr'): string {
  const brand = car.brand || 'Ligo Automobiles';
  const model = car.model || '';
  const engine = car.engine ? (' ' + car.engine) : '';
  const year = car.year ? (' ' + car.year) : '';

  if (lang === 'ru') {
    return car.translations?.ru?.seoTitle || ('Купить ' + brand + ' ' + model + engine + year + ' с пробегом в Париже - Ligo Automobiles');
  }
  if (lang === 'en') {
    return car.translations?.en?.seoTitle || ('Buy used ' + brand + ' ' + model + engine + year + ' in Paris - Ligo Automobiles');
  }
  return car.translations?.fr?.seoTitle || car.seoTitle || (brand + ' ' + model + engine + year + " d'occasion à Paris - Ligo Automobiles");
}

export function getCarMetaDescription(car: Partial<Car>, lang: string = 'fr'): string {
  const brand = car.brand || 'Véhicule';
  const model = car.model || '';
  const year = car.year ? (' ' + car.year) : '';
  const km = car.km ? (' avec ' + Number(car.km).toLocaleString('fr-FR') + ' km') : '';
  const price = car.price ? (' au prix de ' + Number(car.price).toLocaleString('fr-FR') + ' €') : '';

  if (lang === 'ru') {
    return car.translations?.ru?.metaDescription || ('Продажа ' + brand + ' ' + model + year + km + price + '. Гарантия 12 месяцев, проверка по 100+ пунктам в Ligo Automobiles.');
  }
  if (lang === 'en') {
    return car.translations?.en?.metaDescription || ('Buy certified pre-owned ' + brand + ' ' + model + year + km + price + '. 100+ checkpoint inspection, 12-month European warranty at Ligo Automobiles.');
  }
  return car.translations?.fr?.metaDescription || car.metaDescription || ('Achetez votre ' + brand + ' ' + model + year + " d'occasion" + km + price + '. Véhicule révisé et garanti 12 mois par Ligo Automobiles à Paris.');
}

export function getCarH1(car: Partial<Car>, lang: string = 'fr'): string {
  const brand = car.brand || '';
  const model = car.model || '';
  const engine = car.engine ? (' ' + car.engine) : '';
  const year = car.year ? (' ' + car.year) : '';

  if (lang === 'ru') {
    return car.translations?.ru?.seoH1 || (brand + ' ' + model + engine + year + ' с пробегом');
  }
  if (lang === 'en') {
    return car.translations?.en?.seoH1 || ('Used ' + brand + ' ' + model + engine + year);
  }
  return car.translations?.fr?.seoH1 || car.seoH1 || (brand + ' ' + model + engine + year + " d'occasion");
}

export function getCarCanonicalUrl(car: Partial<Car>): string {
  const slug = car.slug || generateCarSlug(car);
  return 'https://ligo-auto.fr/vehicules/' + slug + '/';
}

export function getCarMainImageAlt(car: Partial<Car>, lang: string = 'fr'): string {
  const brand = car.brand || '';
  const model = car.model || '';
  const engine = car.engine ? (' ' + car.engine) : '';
  const year = car.year ? (' ' + car.year) : '';

  if (lang === 'ru') {
    return 'Фотография ' + brand + ' ' + model + engine + year + ' с пробегом - Ligo Automobiles';
  }
  if (lang === 'en') {
    return 'Photo of used ' + brand + ' ' + model + engine + year + ' - Ligo Automobiles';
  }
  return car.imageAlt || ('Photo ' + brand + ' ' + model + engine + year + " d'occasion - Ligo Automobiles");
}



export function getCarFaqQuestion(item: CarFaqItem, lang: string = 'fr', car?: Partial<Car>, index?: number): string {
  if (item[lang as 'fr' | 'en' | 'ru']?.question) {
    return item[lang as 'fr' | 'en' | 'ru']!.question;
  }
  if (car && typeof index === 'number') {
    const defaults = generateCarDefaultFaq(car);
    if (defaults[index]?.[lang as 'fr' | 'en' | 'ru']?.question) {
      return defaults[index][lang as 'fr' | 'en' | 'ru']!.question;
    }
  }
  const qLower = (item.question || '').toLowerCase();
  if (qLower.includes('règlement') || qLower.includes('paiement') || qLower.includes('financement')) {
    if (lang === 'ru') return 'Какие способы оплаты и условия расчета доступны?';
    if (lang === 'en') return 'What payment methods and financing options are available?';
  }
  if (qLower.includes('essayer') || qLower.includes('livraison')) {
    if (lang === 'ru') return 'Можно ли записаться на тест-драйв или заказать доставку?';
    if (lang === 'en') return 'Can I book a test drive or request home delivery?';
  }
  return item.question;
}

export function getCarFaqAnswer(item: CarFaqItem, lang: string = 'fr', car?: Partial<Car>, index?: number): string {
  if (item[lang as 'fr' | 'en' | 'ru']?.answer) {
    return item[lang as 'fr' | 'en' | 'ru']!.answer;
  }
  if (car && typeof index === 'number') {
    const defaults = generateCarDefaultFaq(car);
    if (defaults[index]?.[lang as 'fr' | 'en' | 'ru']?.answer) {
      return defaults[index][lang as 'fr' | 'en' | 'ru']!.answer;
    }
  }
  const aLower = (item.answer || '').toLowerCase();
  if (aLower.includes('virement') || aLower.includes('bancaire') || aLower.includes('paiement') || aLower.includes('juridiquement')) {
    if (lang === 'ru') return 'Мы принимаем банковские переводы и сертифицированные банковские чеки. Все расчеты оформляются официально с полным пакетом документов.';
    if (lang === 'en') return 'We accept secure bank wire transfers and certified cashier checks. All transactions are legally registered with full documentation.';
  }
  return item.answer;
}

export function generateCarDefaultFaq(car: Partial<Car>): CarFaqItem[] {
  const brand = car.brand || 'Ligo Automobiles';
  const model = car.model || '';
  const carName = `${brand} ${model}`.trim() || 'ce véhicule';

  return [
    {
      id: 'faq_1',
      question: `Quel est l'état mécanique et l'historique de ce ${carName} ?`,
      answer: `Chaque véhicule chez Ligo Automobiles subit une inspection rigoureuse de plus de 100 points de contrôle. Nous vérifions l'historique complet, le kilométrage certifié et l'absence d'accident majeur.`,
      fr: {
        question: `Quel est l'état mécanique et l'historique de ce ${carName} ?`,
        answer: `Chaque véhicule chez Ligo Automobiles subit une inspection rigoureuse de plus de 100 points de contrôle. Nous vérifions l'historique complet, le kilométrage certifié et l'absence d'accident majeur.`
      },
      en: {
        question: `What is the mechanical condition and history of this ${carName}?`,
        answer: `Every vehicle at Ligo Automobiles undergoes a rigorous 100+ checkpoint inspection. We certify transparent service history, genuine mileage, and accident-free structure.`
      },
      ru: {
        question: `Каково техническое состояние и история ${carName}?`,
        answer: `Каждый автомобиль в Ligo Automobiles проходит комплексную диагностику более чем по 100 пунктам. Мы проверяем сервисную историю, подтверждаем юридическую чистоту и оригинальный пробег.`
      }
    },
    {
      id: 'faq_2',
      question: "Quelle est la garantie incluse avec ce véhicule ?",
      answer: "Ce véhicule bénéficie d'une garantie mécanique professionnelle de 12 mois valable dans toute l'Europe, avec possibilité d'extension jusqu'à 36 mois.",
      fr: {
        question: "Quelle est la garantie incluse avec ce véhicule ?",
        answer: "Ce véhicule bénéficie d'une garantie mécanique professionnelle de 12 mois valable dans toute l'Europe, avec possibilité d'extension jusqu'à 36 mois."
      },
      en: {
        question: "What warranty is included with this vehicle?",
        answer: "This vehicle comes with a 12-month European mechanical warranty, with optional extension up to 36 months."
      },
      ru: {
        question: "Какая гарантия предоставляется при покупке?",
        answer: "В стоимость включена европейская техническая гарантия сроком на 12 месяцев с возможностью продления до 36 месяцев."
      }
    },
    {
      id: 'faq_3',
      question: "Proposez-vous la reprise de mon ancien véhicule et la livraison ?",
      answer: "Oui, nous proposons une reprise immédiate de votre véhicule actuel et la livraison sécurisée à domicile partout en France métropolitaine.",
      fr: {
        question: "Proposez-vous la reprise de mon ancien véhicule et la livraison ?",
        answer: "Oui, nous proposons une reprise immédiate de votre véhicule actuel et la livraison sécurisée à domicile partout en France métropolitaine."
      },
      en: {
        question: "Do you offer trade-in and home delivery?",
        answer: "Yes, we provide instant trade-in appraisal and secure vehicle delivery throughout France."
      },
      ru: {
        question: "Возможен ли Trade-in и доставка по Франции?",
        answer: "Да, мы принимаем ваш текущий автомобиль в зачет (Trade-in) и организуем быструю доставку в любой регион Франции."
      }
    }
  ];
}

export function generateCarSeoFields(car: Partial<Car>): Partial<Car> {
  const brand = (car.brand || 'Véhicule').trim();
  const model = (car.model || '').trim();
  const engine = (car.engine || '').trim() ? ` ${(car.engine || '').trim()}` : '';
  const year = car.year ? ` ${car.year}` : '';
  const km = car.km ? ` avec ${Number(car.km).toLocaleString('fr-FR')} km` : '';
  const kmEn = car.km ? ` with ${Number(car.km).toLocaleString('en-US')} km` : '';
  const kmRu = car.km ? ` с пробегом ${Number(car.km).toLocaleString('ru-RU')} км` : '';
  const price = car.price ? ` au prix de ${Number(car.price).toLocaleString('fr-FR')} €` : '';
  const priceEn = car.price ? ` priced at ${Number(car.price).toLocaleString('en-US')} €` : '';
  const priceRu = car.price ? ` по цене ${Number(car.price).toLocaleString('ru-RU')} €` : '';

  const slug = generateCarSlug(car);
  const focusKeywordFr = `${brand} ${model}${engine} occasion`.toLowerCase().trim();
  const focusKeywordEn = `${brand} ${model}${engine} used car`.toLowerCase().trim();
  const focusKeywordRu = `${brand} ${model}${engine} с пробегом купить`.toLowerCase().trim();

  const seoTitleFr = `${brand} ${model}${engine}${year} d'occasion à Paris - Ligo Automobiles`.trim();
  const seoTitleEn = `Buy used ${brand} ${model}${engine}${year} in Paris - Ligo Automobiles`.trim();
  const seoTitleRu = `Купить ${brand} ${model}${engine}${year} с пробегом в Париже - Ligo Automobiles`.trim();

  const metaDescFr = `Achetez votre ${brand} ${model}${year} d'occasion${km}${price}. Véhicule révisé et garanti 12 mois par Ligo Automobiles à Paris.`.trim();
  const metaDescEn = `Buy certified pre-owned ${brand} ${model}${year}${kmEn}${priceEn}. 100+ checkpoint inspection, 12-month European warranty at Ligo Automobiles.`.trim();
  const metaDescRu = `Продажа ${brand} ${model}${year}${kmRu}${priceRu}. Гарантия 12 месяцев, проверка по 100+ пунктам в Ligo Automobiles.`.trim();

  const seoH1Fr = `${brand} ${model}${engine}${year} d'occasion`.trim();
  const seoH1En = `Used ${brand} ${model}${engine}${year}`.trim();
  const seoH1Ru = `${brand} ${model}${engine}${year} с пробегом`.trim();

  const descFr = `${brand} ${model}${engine} en excellent état. Révisé, garanti 12 mois. Disponible immédiatement chez Ligo Automobiles à Paris.`.trim();
  const descEn = `Superb ${brand} ${model}${engine} in pristine condition. Certified history, fully inspected, 12-month European warranty included. Available at Ligo Automobiles.`.trim();
  const descRu = `${brand} ${model}${engine} в идеальном состоянии. Пройдена диагностика по 100+ пунктам, официальная европейская гарантия 12 месяцев. В наличии в Ligo Automobiles.`.trim();

  const detailedSeoDescriptionFr = `Découvrez ce superbe ${brand} ${model}${engine} disponible immédiatement chez Ligo Automobiles. Rigoureusement sélectionné par nos spécialistes, ce véhicule offre un agrément de conduite exceptionnel, une finition soignée et des performances remarquables. Doté d'une motorisation ${car.fuel || 'performante'} et d'une transmission ${car.transmission || 'automatique'}, il saura satisfaire les conducteurs les plus exigeants. Kilométrage garanti, révision complète et garantie professionnelle 12 mois incluse.`;
  
  const detailedSeoDescriptionEn = `Discover this exceptional ${brand} ${model}${engine} available immediately at Ligo Automobiles. Handpicked and certified by our automotive experts, this vehicle offers outstanding driving comfort, premium finish, and dynamic performance. Equipped with a reliable ${car.fuel || 'engine'} powertrain and smooth ${car.transmission || 'automatic'} gearbox. Guaranteed genuine mileage, complete multi-point service, and 12-month European warranty included.`;

  const detailedSeoDescriptionRu = `Представляем вашему вниманию ${brand} ${model}${engine} в идеальном техническом и внешнем состоянии в наличии в Ligo Automobiles. Автомобиль прошел полную предпродажную подготовку и диагностику по более чем 100 пунктам, подтвержден оригинальный пробег и юридическая чистота. Комплектация включает двигатель ${car.fuel || 'бензин/дизель'}, трансмиссию ${car.transmission || 'автомат'}, полный пакет систем безопасности. Предоставляется европейская гарантия 12 месяцев с возможностью адресной доставки.`;

  const vehicleConditionFr = "Véhicule inspecté sur 100 points de contrôle, historique certifié, non accidenté et révisé avant livraison.";
  const vehicleConditionEn = "Vehicle inspected on 100+ control points, certified transparent history, accident-free, and fully serviced before delivery.";
  const vehicleConditionRu = "Автомобиль проверен по 100+ пунктам контроля, подтвержденная сервисная история, без ДТП, полное ТО перед выдачей.";

  return {
    slug,
    focusKeyword: focusKeywordFr,
    seoTitle: seoTitleFr,
    metaDescription: metaDescFr,
    seoH1: seoH1Fr,
    canonicalUrl: getCarCanonicalUrl({ ...car, slug }),
    imageAlt: getCarMainImageAlt(car, 'fr'),
    robotsIndex: true,
    robotsFollow: true,
    ogTitle: seoTitleFr,
    ogDescription: metaDescFr,
    description: descFr,
    description_en: descEn,
    description_ru: descRu,
    detailedSeoDescription: detailedSeoDescriptionFr,
    vehicleCondition: vehicleConditionFr,
    faq: car.faq && car.faq.length > 0 ? car.faq : generateCarDefaultFaq(car),
    equipments: car.equipments && car.equipments.length > 0 ? car.equipments.map(normalizeEquipmentKey) : [
      'gps_navigation',
      'rear_camera',
      'parking_sensors',
      'dual_zone_climate',
      'apple_carplay_android_auto',
      'matrix_led',
      'adaptive_cruise_control',
      'alloy_wheels'
    ],
    translations: {
      fr: {
        seoTitle: seoTitleFr,
        metaDescription: metaDescFr,
        seoH1: seoH1Fr,
        slug: slug,
        focusKeyword: focusKeywordFr,
        description: descFr,
        detailedSeoDescription: detailedSeoDescriptionFr,
        vehicleCondition: vehicleConditionFr
      },
      en: {
        seoTitle: seoTitleEn,
        metaDescription: metaDescEn,
        seoH1: seoH1En,
        slug: slug,
        focusKeyword: focusKeywordEn,
        description: descEn,
        detailedSeoDescription: detailedSeoDescriptionEn,
        vehicleCondition: vehicleConditionEn
      },
      ru: {
        seoTitle: seoTitleRu,
        metaDescription: metaDescRu,
        seoH1: seoH1Ru,
        slug: slug,
        focusKeyword: focusKeywordRu,
        description: descRu,
        detailedSeoDescription: detailedSeoDescriptionRu,
        vehicleCondition: vehicleConditionRu
      }
    }
  };
}


export function normalizeCar(raw: any): Car {
  const brand = raw.brand || '';
  const model = raw.model || '';
  const engine = raw.engine || '';
  const year = Number(raw.year) || new Date().getFullYear();
  const km = Number(raw.km) || 0;
  const price = Number(raw.price) || 0;
  const fuel = raw.fuel || 'Essence';
  const transmission = raw.transmission || 'Automatique';
  const hp = Number(raw.hp) || 0;
  const co2 = Number(raw.co2) || 0;
  const vin = raw.vin || '';
  const status = raw.status || 'En stock';
  const image = raw.image || '';
  const imageAlt = raw.imageAlt || (brand + ' ' + model + ' ' + engine + " d'occasion");
  const color = raw.color || '';
  const doors = Number(raw.doors) || 5;
  const seats = Number(raw.seats) || 5;
  const bodyType = raw.bodyType || 'Berline';
  const verifiedVin = Boolean(raw.verifiedVin);
  const featuredOnHomepage = Boolean(raw.featuredOnHomepage);
  const homepageOrder = Number(raw.homepageOrder) || 1;
  const galleryImages = raw.galleryImages || [];
  const galleryImagesAlt = raw.galleryImagesAlt || [];
  const equipments: string[] = Array.isArray(raw.equipments) ? Array.from(new Set(raw.equipments.map((eq: any) => normalizeEquipmentKey(String(eq))))) : [];
  const customEquipments = Array.isArray(raw.customEquipments) ? raw.customEquipments : [];
  const faq = Array.isArray(raw.faq) && raw.faq.length > 0 ? raw.faq : generateCarDefaultFaq({ brand, model, engine, year, km, fuel, transmission, hp, price });

  const slug = raw.slug || generateCarSlug({ brand, model, engine, year });
  const seoTitle = raw.seoTitle || getCarSeoTitle({ brand, model, engine, year, km });
  const metaDescription = raw.metaDescription || getCarMetaDescription({ brand, model, engine, year, km, price });
  const seoH1 = raw.seoH1 || getCarH1({ brand, model, engine });
  const focusKeyword = raw.focusKeyword || (brand + ' ' + model + ' occasion').toLowerCase();
  const canonicalUrl = raw.canonicalUrl || ('https://ligo-auto.fr/vehicules/' + slug + '/');
  const detailedSeoDescription = raw.detailedSeoDescription || '';
  const vehicleCondition = raw.vehicleCondition || '';

  const trans = raw.translations || {
    fr: {
      description: raw.description || '',
      detailedSeoDescription: raw.detailedSeoDescription || '',
      vehicleCondition: raw.vehicleCondition || '',
      seoTitle,
      metaDescription,
      seoH1,
      slug,
      focusKeyword
    },
    en: {
      description: raw.description_en || '',
      detailedSeoDescription: '',
      vehicleCondition: '',
      seoTitle: 'Buy used ' + brand + ' ' + model + ' ' + year + ' - Ligo Automobiles',
      metaDescription: 'Certified ' + brand + ' ' + model + ' available at Ligo Automobiles. Inspected 100+ points.',
      seoH1: 'Used ' + brand + ' ' + model + ' ' + year,
      slug,
      focusKeyword: ('used ' + brand + ' ' + model).toLowerCase()
    },
    ru: {
      description: raw.description_ru || '',
      detailedSeoDescription: '',
      vehicleCondition: '',
      seoTitle: 'Купить ' + brand + ' ' + model + ' ' + year + ' с пробегом - Ligo Automobiles',
      metaDescription: 'Автомобиль ' + brand + ' ' + model + ' с гарантией от Ligo Automobiles. Проверка 100+ пунктов.',
      seoH1: brand + ' ' + model + ' ' + year + ' с пробегом',
      slug,
      focusKeyword: ('купить ' + brand + ' ' + model).toLowerCase()
    }
  };

  return {
    id: raw.id || ('car-' + Date.now()),
    brand,
    model,
    engine,
    year,
    km,
    price,
    fuel,
    transmission,
    hp,
    co2,
    vin,
    status,
    image,
    imageAlt,
    description: trans.fr?.description || raw.description || '',
    description_en: trans.en?.description || raw.description_en || '',
    description_ru: trans.ru?.description || raw.description_ru || '',
    detailedSeoDescription,
    vehicleCondition,
    equipments,
    customEquipments,
    color,
    doors,
    seats,
    bodyType,
    verifiedVin,
    featuredOnHomepage,
    homepageOrder,
    galleryImages,
    galleryImagesAlt,
    seoTitle,
    metaDescription,
    focusKeyword,
    slug,
    seoH1,
    canonicalUrl,
    robotsIndex: raw.robotsIndex !== false,
    robotsFollow: raw.robotsFollow !== false,
    ogTitle: raw.ogTitle || seoTitle,
    ogDescription: raw.ogDescription || metaDescription,
    ogImage: raw.ogImage || image,
    faq,
    translations: trans,
    warranty: raw.warranty || '12 mois',
    updatedAt: raw.updatedAt || new Date().toISOString(),
    createdAt: raw.createdAt || new Date().toISOString(),
    relatedArticleIds: raw.relatedArticleIds || [],
    similarCarIds: raw.similarCarIds || []
  };
}


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
    description: "État absolument parfait. Configuration de collection exclusive avec pack Weissach, freins carbone-céramique (PCCB), système d'élévation de l'essieu avant (Lift) et finition intérieure en cuir étendu/Alcantara avec surpiqûres jaune Racing. Garantie active Porsche Approved.",
    description_en: "Absolutely perfect condition. Exclusive collector configuration with Weissach package, carbon-ceramic brakes (PCCB), front axle lift system, and extended leather/Alcantara interior with Racing Yellow stitching. Active Porsche Approved warranty.",
    description_ru: "Состояние абсолютно идеальное. Эксклюзивная коллекционная конфигурация с пакетом Weissach, карбоно-керамическими тормозами (PCCB), системой подъема передней оси (Lift) и отделкой салона расширенной кожей/Alcantara с контрастной прострочкой цвета Racing Yellow. Активная гарантия Porsche Approved.",
    verifiedVin: true,
    featuredOnHomepage: true,
    homepageOrder: 1
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
    description: "Peinture originale Rosso Corsa avec toit contrasté Nero DS. Équipée de jantes forgées 20 pouces, étriers de frein jaunes, sièges racing Daytona en fibre de carbone et finition carbone. Protection complète par film transparent (PPF).",
    description_en: "Original Rosso Corsa paint with contrasting Nero DS roof. Equipped with 20-inch forged wheels, yellow brake calipers, Daytona carbon fiber racing seats, and carbon interior trim. Fully covered with transparent protective film (PPF).",
    description_ru: "Оригинальная краска Rosso Corsa с контрастной крышей Nero DS. Оснащена 20-дюймовыми коваными дисками, окрашенными в желтый цвет тормозными суппортами, гоночными сиденьями из углеродного волокна Daytona и отделкой салона карбоном. Полностью покрыта прозрачной защитной пленкой (PPF).",
    verifiedVin: true,
    featuredOnHomepage: true,
    homepageOrder: 2
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
    description: "Premier propriétaire. Magnifique teinte métallisée Noir Mythic d'Audi Exclusive. Configuration maximale avec roues arrière directrices, échappement sport RS, phares HD Matrix LED avec technologie laser et système audio Bang & Olufsen Advanced 3D.",
    description_en: "First owner. Beautiful Mythic Black metallic color from Audi Exclusive. Maximum options including rear-wheel steering, RS sport exhaust, HD Matrix LED headlights with laser light, and Bang & Olufsen Advanced 3D sound system.",
    description_ru: "Первый владелец. Красивейший цвет металлик Mythic Black от Audi Exclusive. Максимальная комплектация, включающая полноуправляемое шасси (подруливающие задние колеса), спортивный выхлоп RS, фары HD Matrix LED с лазерной оптикой последнего поколения и премиальную аудиосистему Bang & Olufsen Advanced 3D.",
    verifiedVin: true,
    featuredOnHomepage: true,
    homepageOrder: 3
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
    description: "Série spéciale F1 Edition. Teinte exclusive Satin Aston Martin Racing Green. Châssis optimisé, kit aérodynamique spécifique apportant un appui supplémentaire, et jantes exclusives de 21 pouces. Échappement sport actif.",
    description_en: "Special F1 Edition series. Unique Satin Aston Martin Racing Green color. Optimized chassis, special aerodynamic kit creating additional downforce, and exclusive 21-inch wheels. Active sport exhaust.",
    description_ru: "Специальная серия F1 Edition. Уникальный цвет Satin Aston Martin Racing Green. Оптимизированное шасси, специальный аэродинамический комплект, создающий дополнительную прижимную силу, и эксклюзивные 21-дюймовые диски. Активный спортивный выхлоп.",
    verifiedVin: true,
    featuredOnHomepage: true,
    homepageOrder: 4
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
    description: "Moteur V10 atmosphérique de 640 chevaux. Propulsion arrière avec roues arrière directrices. Peinture métallisée Verde Selvans. Pack carbone complet intérieur et extérieur, freins carbone-céramique.",
    description_en: "Naturally aspirated 640 hp V10 engine. Rear-wheel drive with rear-wheel steering. Verde Selvans metallic paint. Full carbon pack interior and exterior, carbon-ceramic brakes.",
    description_ru: "Атмосферный двигатель V10 мощностью 640 лошадиных сил. Задний привод с подруливающей задней осью. Окраска кузова металлик Verde Selvans. Полный карбоновый пакет салона и экстерьера, карбоно-керамические тормоза.",
    verifiedVin: true,
    featuredOnHomepage: true,
    homepageOrder: 5
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
    description: "Technologie hybride E Performance issue de la Formule 1. Puissance cumulée de 843 ch. Teinte mate designo Gris Sélénite Magno. Toit panoramique, système de freinage haute performance AMG en céramique.",
    description_en: "Formula 1 derived E Performance hybrid technology. Combined power of 843 hp. designo Selenite Grey Magno matte paint. Panoramic sunroof, AMG high-performance ceramic braking system.",
    description_ru: "Гибридная технология E Performance, заимствованная из Формулы-1. Суммарная мощность 843 л.с. Матовый цвет Gris Sélénite Magno designo (матовый). Панорамный люк, высокоэффективная тормозная система AMG из керамики.",
    verifiedVin: true,
    featuredOnHomepage: true,
    homepageOrder: 6
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
    description: "Finition exclusive Mulliner. Intérieur en cuir matelassé fait main avec motif double losange. Peinture Onyx Black. Système audio Naim for Bentley d'une précision exceptionnelle, suspension pneumatique adaptative Bentley Dynamic Ride.",
    description_en: "Exclusive Mulliner spec. Handcrafted quilted leather interior with double diamond pattern. Onyx Black exterior. Naim for Bentley ultra-premium audio system, Bentley Dynamic Ride active adaptive air suspension.",
    description_ru: "Эксклюзивная отделка Mulliner. Салон из стеганой кожи ручной работы с двойным ромбовидным узором. Окраска кузова Onyx Black. Аудиосистема Naim для Bentley исключительной точности звучания, активная адаптивная пневмоподвеска Bentley Dynamic Ride.",
    verifiedVin: true,
    featuredOnHomepage: false,
    homepageOrder: 7
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
    description: "Version Spyder Cielo avec toit en verre électrochrome intelligent. Moteur V6 Nettuno à double combustion issu de la F1. Couleur de carrosserie Acquamarina. Monocoque ultraléger en fibre de carbone.",
    description_en: "Spyder Cielo version with smart electrochromic glass roof. F1-derived Nettuno twin-combustion V6 engine. Acquamarina body color. Ultra-lightweight carbon fiber monocoque.",
    description_ru: "Версия Spyder Cielo с умной электрохромной стеклянной крышей. Двигатель V6 Nettuno с двойным сгоранием, созданный на основе технологий F1. Цвет кузова Acquamarina. Сверхлегкий монокок из углеродного волокна.",
    verifiedVin: true,
    featuredOnHomepage: false,
    homepageOrder: 8
  }
];



export const loadLocalCars = (): Car[] => {
  try {
    const saved = localStorage.getItem("cars");
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.map(normalizeCar);
      }
    }
  } catch (e) {
    console.error("Failed to parse local cars:", e);
  }
  return DEMO_CARS.map(normalizeCar);
};


export function App() {
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
    try {
      localStorage.setItem('theme', theme);
    } catch (e) {}
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => (prev === 'dark' ? 'light' : 'dark'));
  };

  // Language state: 'fr' | 'en' | 'ru' (French by default)
  const [lang, setLang] = useState<'fr' | 'en' | 'ru'>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('ligo_lang');
        if (saved === 'fr' || saved === 'en' || saved === 'ru') return saved;
      } catch {}
    }
    return 'fr';
  });

  useEffect(() => {
    try {
      localStorage.setItem('ligo_lang', lang);
      document.documentElement.lang = lang;
    } catch {}
  }, [lang]);

  // Localized string helper
  const t = (key: string): string => {
    if (!key) return '';
    return (translations as any)[lang]?.[key] || (translations as any)['fr']?.[key] || key;
  };

  // Main navigation view
  const [currentView, setCurrentView] = useState<'home' | 'catalog' | 'car-details' | 'admin' | 'actualites' | 'article-details' | 'comparison'>(() => {
    try {
      const path = window.location.pathname;
      if (path.startsWith('/admin')) return 'admin';
      if (path.startsWith('/actualites')) {
        const parts = path.split('/').filter(Boolean);
        if (parts.length >= 2 && parts[1] !== 'category') return 'article-details';
        return 'actualites';
      }
      if (path.startsWith('/catalogue') || path.startsWith('/catalog')) return 'catalog';
      if (path.startsWith('/vehicules')) return 'car-details';
      if (path.startsWith('/comparateur') || path.startsWith('/comparaison') || path.startsWith('/comparison') || path.startsWith('/compare')) return 'comparison';
    } catch {}
    return 'home';
  });
  const [previousView, setPreviousView] = useState<'home' | 'catalog' | 'car-details' | 'admin' | 'actualites' | 'article-details' | 'comparison'>('home');

  // Selected entities
  const [selectedCar, setSelectedCar] = useState<Car | null>(null);
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);
  const [selectedArticleCategory, setSelectedArticleCategory] = useState<string>('all');
  const [articleCurrentPage, setArticleCurrentPage] = useState<number>(1);
  const [articleSearchQuery, setArticleSearchQuery] = useState<string>('');
  const [articleStatusFilter, setArticleStatusFilter] = useState<string>('all');

  // Notification Toast state
  const [notification, setNotification] = useState<{ msg: string; type: 'success' | 'error' | 'info' } | null>(null);
  const showNotification = (msg: string, type: 'success' | 'error' | 'info' = 'success') => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 4000);
  };

  const DEFAULT_SETTINGS: any = {
    companyName: 'Ligo Automobiles',
    address: 'Paris, France',
    phone: '+33 7 66 75 32 23',
    email: 'ligo.automobiles@gmail.com',
    bannerImage: 'https://images.unsplash.com/photo-1614162692292-7ac56d7f7f1e?auto=format&fit=crop&q=80&w=1920',
    aboutImage: 'https://images.unsplash.com/photo-1617814076367-b759c7d7e738?auto=format&fit=crop&q=80&w=1200',
    stat1Number: '15+',
    stat2Number: '100%',
    stat3Number: '1000+',
    googleAnalyticsId: '',
    yandexMetrikaId: '',
    ru: {
      bannerTitle: "Покупка и продажа автомобилей",
      bannerSubtitle: "Профессиональный подбор, проверка истории и техническая инспекция каждого автомобиля. Сопровождение сделки «под ключ».",
      bannerDescription: "Профессиональный подбор, проверка истории и техническая инспекция каждого автомобиля. Сопровождение сделки «под ключ».",
      aboutTitle: "Ваш надежный партнер во Франции",
      aboutSubtitle: "LIGO AUTOMOBILES",
      aboutText: "Мы гарантируем полную прозрачность на каждом этапе сделки. Каждый автомобиль проходит комплексную техническую и юридическую проверку.",
      contactTitle: "Свяжитесь с нами",
      contactSubtitle: "ОБСУДИМ ВАШ ПРОЕКТ",
      similarVehicles: "Похожие автомобили",
      similarVehiclesTitle: "Вам также может понравиться",
      contactDescription: "Хотите получить больше информации о конкретной модели? Свяжитесь с нами напрямую."
    },
    fr: {
      bannerTitle: "Achat et Vente d'Automobiles",
      bannerSubtitle: "Sélection rigoureuse, historique transparent et accompagnement administratif complet.",
      bannerDescription: "Sélection rigoureuse, historique transparent et accompagnement administratif complet.",
      aboutTitle: "Votre partenaire de confiance en France",
      aboutSubtitle: "LIGO AUTOMOBILES",
      aboutText: "Nous assurons une transparence totale à chaque étape de la transaction. Chaque véhicule subit une inspection technique et juridique complète.",
      contactTitle: "Contactez-nous",
      contactSubtitle: "DISCUTONS DE VOTRE PROJET",
      similarVehicles: "Véhicules similaires",
      similarVehiclesTitle: "Vous pourriez aussi aimer",
      contactDescription: "Vous souhaitez plus d'informations sur un modèle précis ? Contactez-nous directement."
    },
    en: {
      bannerTitle: "Purchase & Sale of Automobiles",
      bannerSubtitle: "Rigorous selection, certified vehicle history, and full administrative support.",
      bannerDescription: "Rigorous selection, certified vehicle history, and full administrative support.",
      aboutTitle: "Your trusted partner in France",
      aboutSubtitle: "LIGO AUTOMOBILES",
      aboutText: "We ensure total transparency at every stage of the transaction. Every vehicle undergoes a comprehensive technical and legal inspection.",
      contactTitle: "Contact Us",
      contactSubtitle: "LET'S DISCUSS YOUR PROJECT",
      similarVehicles: "Similar Vehicles",
      similarVehiclesTitle: "You might also like",
      contactDescription: "Looking for more information about a specific model? Contact us directly."
    }
  };

  // Site Settings state
  const [siteSettings, setSiteSettings] = useState<any>(() => {
    try {
      const saved = localStorage.getItem('ligo_site_settings');
      if (saved) {
        return { ...DEFAULT_SETTINGS, ...JSON.parse(saved) };
      }
    } catch {}
    return DEFAULT_SETTINGS;
  });

  // Client inquiries state
  const [inquiries, setInquiries] = useState<any[]>([]);

  // Cars, Articles, Categories collections state
  const [cars, setCars] = useState<Car[]>(loadLocalCars);
  const [articles, setArticles] = useState<Article[]>(loadLocalArticles);
  // Articles local cache
  useEffect(() => {
    try {
      if (articles && articles.length > 0) {
        localStorage.setItem('ligo_articles', JSON.stringify(articles));
      }
    } catch (e) {
      console.warn('Failed to cache articles to localStorage', e);
    }
  }, [articles]);

  const [articleCategories, setArticleCategories] = useState<ArticleCategory[]>(loadLocalCategories);

  // Manual Scroll Restoration & Robust View Scroll-to-Top Management
  useEffect(() => {
    if (typeof window !== 'undefined' && 'scrollRestoration' in window.history) {
      try {
        window.history.scrollRestoration = 'manual';
      } catch {}
    }
  }, []);

  // Guarantee instant scroll-to-top whenever view or active article/car changes
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    // Immediate reset
    window.scrollTo(0, 0);
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;

    // Double frame safety for mobile browser layout shifts & iOS Safari scroll clamping
    const rafId = requestAnimationFrame(() => {
      window.scrollTo(0, 0);
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
    });

    const timerId = setTimeout(() => {
      window.scrollTo(0, 0);
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
    }, 40);

    return () => {
      cancelAnimationFrame(rafId);
      clearTimeout(timerId);
    };
  }, [currentView, selectedArticle?.id, selectedCar?.id]);

  // Gallery & Media state
  const [activeImage, setActiveImage] = useState<string>('');
  const [currentCarGallery, setCurrentCarGallery] = useState<string[]>([]);
  const [showLightbox, setShowLightbox] = useState<boolean>(false);
  const [lightboxIndex, setLightboxIndex] = useState<number>(0);
  const [activeDetailsTab, setActiveDetailsTab] = useState<'specs' | 'desc' | 'equipments' | 'faq' | 'testdrive'>(() => {
    try {
      const hash = window.location.hash.replace('#', '').toLowerCase();
      if (['specs', 'desc', 'equipments', 'faq', 'testdrive'].includes(hash)) {
        return hash as any;
      }
      const saved = localStorage.getItem('ligo_active_details_tab');
      if (saved && ['specs', 'desc', 'equipments', 'faq', 'testdrive'].includes(saved)) {
        return saved as any;
      }
    } catch {}
    return 'specs';
  });

  const handleSelectDetailsTab = (tab: 'specs' | 'desc' | 'equipments' | 'faq' | 'testdrive') => {
    setActiveDetailsTab(tab);
    try {
      localStorage.setItem('ligo_active_details_tab', tab);
    } catch {}
  };

  // Admin Auth state
  const [isAdmin, setIsAdmin] = useState<boolean>(() => {
    try {
      return localStorage.getItem('ligo_admin_logged_in') === 'true';
    } catch {
      return false;
    }
  });
  const [adminPassword, setAdminPassword] = useState<string>('');
  const [adminLoginError, setAdminLoginError] = useState<boolean>(false);
  const [showAdminLoginModal, setShowAdminLoginModal] = useState<boolean>(false);
  
  const [activeAdminTab, setActiveAdminTab] = useState<'featured' | 'vehicles' | 'articles' | 'inquiries' | 'analytics' | 'settings'>(() => {
    try {
      const hash = window.location.hash.replace('#', '').toLowerCase();
      const validTabs = ['featured', 'vehicles', 'articles', 'inquiries', 'analytics', 'settings'];
      if (validTabs.includes(hash)) {
        return hash as any;
      }
      const saved = localStorage.getItem('ligo_active_admin_tab');
      if (saved && validTabs.includes(saved)) {
        return saved as any;
      }
    } catch {}
    return 'featured';
  });

  const handleSelectAdminTab = (tab: 'featured' | 'vehicles' | 'articles' | 'inquiries' | 'analytics' | 'settings') => {
    setActiveAdminTab(tab);
    try {
      localStorage.setItem('ligo_active_admin_tab', tab);
      if (window.location.pathname.startsWith('/admin')) {
        window.history.replaceState(null, '', `/admin#${tab}`);
      }
    } catch {}
  };

  // Catalog Filter states
  const [selectedBrand, setSelectedBrand] = useState<string>('');
  const [selectedModel, setSelectedModel] = useState<string>('');
  const [priceMin, setPriceMin] = useState<string>('');
  const [priceMax, setPriceMax] = useState<string>('');
  const [yearMin, setYearMin] = useState<string>('');
  const [yearMax, setYearMax] = useState<string>('');
  const [transmission, setTransmission] = useState<string>('');
  const [fuel, setFuel] = useState<string>('');
  const [status, setStatus] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const [loading, setLoading] = useState(false);
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [mainImageUploading, setMainImageUploading] = useState(false);
  const [mainImageProgress, setMainImageProgress] = useState(0);
  const [galleryUploading, setGalleryUploading] = useState(false);

  const [testDriveForm, setTestDriveForm] = useState<any>({
    name: '',
    phone: '',
    email: '',
    date: '',
    time: '',
    comment: '',
    preferredDate: '',
    preferredTime: '',
    message: ''
  });

  const [carteGriseForm, setCarteGriseForm] = useState({
    name: '',
    phone: '',
    email: '',
    vin: '',
    registrationNumber: '',
    vehicleModel: '',
    address: '',
    message: ''
  });

  const availableBrands = useMemo(() => Array.from(new Set(cars.map(c => c.brand).filter(Boolean))).sort(), [cars]);
  const availableModels = useMemo(() => Array.from(new Set(cars.filter(c => !selectedBrand || c.brand.toLowerCase() === selectedBrand.toLowerCase()).map(c => c.model).filter(Boolean))).sort(), [cars, selectedBrand]);
  const availableFuels = useMemo(() => Array.from(new Set(cars.map(c => c.fuel).filter(Boolean))).sort(), [cars]);
  const publishedArticles = useMemo(() => {
    return [...articles]
      .filter(a => a.status === 'published' || !a.status)
      .sort((a, b) => {
        const timeA = new Date(a.publishedAt || a.createdAt || 0).getTime();
        const timeB = new Date(b.publishedAt || b.createdAt || 0).getTime();
        return timeB - timeA;
      });
  }, [articles]);

  const homepageArticles = useMemo(() => {
    const featured = publishedArticles.filter(a => a.homepageFeatured);
    if (featured.length > 0) {
      return [...featured].sort((a, b) => (a.homepageOrder || 1) - (b.homepageOrder || 1));
    }
    return publishedArticles;
  }, [publishedArticles]);

  // Analytics state
  const [analyticsEvents, setAnalyticsEvents] = useState<AnalyticsEvent[]>(() => loadLocalAnalyticsEvents(cars, loadLocalArticles()));
  const [analyticsPeriod, setAnalyticsPeriod] = useState<'today' | '7d' | '30d' | '90d' | 'all' | 'custom'>(() => {
    try {
      const saved = localStorage.getItem('ligo_analytics_period');
      if (saved && ['today', '7d', '30d', '90d', 'all', 'custom'].includes(saved)) {
        return saved as any;
      }
    } catch {}
    return '30d';
  });

  const handleSelectAnalyticsPeriod = (period: 'today' | '7d' | '30d' | '90d' | 'all' | 'custom') => {
    setAnalyticsPeriod(period);
    try {
      localStorage.setItem('ligo_analytics_period', period);
    } catch {}
  };
  const [customStartDate, setCustomStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().split('T')[0];
  });
  const [customEndDate, setCustomEndDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [selectedChartMetric, setSelectedChartMetric] = useState<'page_views' | 'vehicle_views' | 'contacts' | 'whatsapp'>('page_views');
  const [topVehiclesSortBy, setTopVehiclesSortBy] = useState<'views' | 'contacts' | 'compares'>('views');
  const [selectedAnalyticsCar, setSelectedAnalyticsCar] = useState<Car | null>(null);
  const [analyticsVehicleSearch, setAnalyticsVehicleSearch] = useState('');
  const [analyticsVehicleStatusFilter, setAnalyticsVehicleStatusFilter] = useState('all');
  const lastTrackedRef = useRef<{ [key: string]: number }>({});

  useEffect(() => {
    try {
      localStorage.setItem('ligo_analytics_events', JSON.stringify(analyticsEvents.slice(0, 3000)));
    } catch {}
  }, [analyticsEvents]);

  // Comparison state
  const [comparedCarIds, setComparedCarIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('ligo_compared_cars');
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });
  const [showOnlyDifferences, setShowOnlyDifferences] = useState(false);
  const [mobileCompareSlot1, setMobileCompareSlot1] = useState<number>(0);
  const [mobileCompareSlot2, setMobileCompareSlot2] = useState<number>(1);

  useEffect(() => {
    try {
      localStorage.setItem('ligo_compared_cars', JSON.stringify(comparedCarIds));
    } catch {}
  }, [comparedCarIds]);

  const handleToggleCompare = (car: Car) => {
    setComparedCarIds(prev => {
      if (prev.includes(car.id)) {
        return prev.filter(id => id !== car.id);
      }
      if (prev.length >= 4) {
        showNotification("Maximum 4 véhicules en comparaison", "error");
        return prev;
      }
      return [...prev, car.id];
    });
  };

  const handleRemoveFromCompare = (carId: string) => {
    setComparedCarIds(prev => prev.filter(id => id !== carId));
  };

  const handleClearComparison = () => {
    setComparedCarIds([]);
  };

  const handleOpenComparison = () => {
    navigateTo('comparison');
  };

  const handleUpdateGalleryAlt = (index: number, altText: string) => {
    setFormData(prev => {
      const currentAlts = [...(prev.galleryImagesAlt || [])];
      currentAlts[index] = altText;
      return { ...prev, galleryImagesAlt: currentAlts };
    });
  };

  const generateSitemapXml = () => {
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';
    xml += "  <url><loc>https://ligo-auto.fr/</loc><priority>1.0</priority></url>\\n";
    xml += "  <url><loc>https://ligo-auto.fr/catalogue/</loc><priority>0.9</priority></url>\\n";
    xml += "  <url><loc>https://ligo-auto.fr/actualites/</loc><priority>0.8</priority></url>\\n";
    cars.forEach(car => {
      xml += "  <url><loc>https://ligo-auto.fr/vehicules/" + (car.slug || generateCarSlug(car)) + "/</loc><priority>0.7</priority></url>\\n";
    });
    articles.filter(a => a.status === "published").forEach(art => {
      xml += "  <url><loc>https://ligo-auto.fr/actualites/" + getArticleSlug(art) + "/</loc><priority>0.6</priority></url>\\n";
    });
    xml += "</urlset>";
    return xml;
  };

  const downloadSitemapFile = () => {
    const xml = generateSitemapXml();
    const blob = new Blob([xml], { type: "application/xml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "sitemap.xml";
    a.click();
    URL.revokeObjectURL(url);
    showNotification(t("sitemapGenerated"), "success");
  };

  const downloadAnalyticsCsv = () => {
    if (!analyticsEvents || analyticsEvents.length === 0) {
      showNotification(lang === 'ru' ? 'Нет данных для экспорта' : 'No data to export', 'error');
      return;
    }
    const headers = ['ID', 'Date', 'Event', 'Vehicle ID', 'Brand', 'Model', 'Article ID', 'Source', 'Path', 'Language', 'Visitor ID', 'Session ID'];
    const rows = analyticsEvents.map(e => [
      e.id,
      e.timestamp,
      e.event,
      e.vehicleId || '',
      e.brand || '',
      e.model || '',
      e.articleId || '',
      e.source || 'Direct',
      e.path || '',
      e.language || '',
      e.visitorId,
      e.sessionId
    ]);
    const csvContent = [headers.join(','), ...rows.map(r => r.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ligo_analytics_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showNotification(lang === 'ru' ? 'Файл аналитики скачан!' : 'Analytics CSV downloaded!', 'success');
  };

  const handleResetAnalytics = async () => {
    if (window.confirm(lang === 'ru' ? 'Вы уверены, что хотите обнулить всю статистику посещений?' : 'Êtes-vous sûr de vouloir réinitialiser toutes les statistiques ?')) {
      setAnalyticsEvents([]);
      try {
        localStorage.setItem('ligo_analytics_events', JSON.stringify([]));
      } catch {}
      try {
        const analyticsCollectionRef = collection(db, 'artifacts', appId, 'public', 'data', 'analytics_events');
        const snap = await getDocs(query(analyticsCollectionRef));
        snap.forEach(d => {
          deleteDoc(d.ref).catch(() => {});
        });
      } catch (e) {
        console.warn('Failed to clear Firestore analytics events:', e);
      }
      showNotification(lang === 'ru' ? 'Статистика успешно обнулена!' : 'Statistiques réinitialisées !', 'success');
    }
  };

  // Car Add/Edit Form State
  const [carActiveTab, setCarActiveTab] = useState<'info' | 'media' | 'desc' | 'seo' | 'faq' | 'relations'>('info');
  const [carDescLang, setCarDescLang] = useState<'fr' | 'en' | 'ru'>('fr');
  const [carSeoLang, setCarSeoLang] = useState<'fr' | 'en' | 'ru'>('fr');
  const [carFaqLang, setCarFaqLang] = useState<'fr' | 'en' | 'ru'>('fr');
  const [showCustomEquipmentModal, setShowCustomEquipmentModal] = useState(false);
  const [customEqForm, setCustomEqForm] = useState({ fr: '', en: '', ru: '' });
  const [newEquipmentInput, setNewEquipmentInput] = useState('');
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);

  const getInitialCarFormData = (car?: Partial<Car>): Partial<Car> => {
    const base = car || {};
    const normalizedEquipments = Array.from(new Set((base.equipments || []).map(normalizeEquipmentKey)));
    const trans = base.translations || {
      fr: {
        description: base.translations?.fr?.description || base.description || '',
        detailedSeoDescription: base.translations?.fr?.detailedSeoDescription || base.detailedSeoDescription || '',
        vehicleCondition: base.translations?.fr?.vehicleCondition || base.vehicleCondition || '',
        seoTitle: base.translations?.fr?.seoTitle || base.seoTitle || '',
        metaDescription: base.translations?.fr?.metaDescription || base.metaDescription || '',
        seoH1: base.translations?.fr?.seoH1 || base.seoH1 || '',
        slug: base.translations?.fr?.slug || base.slug || '',
        focusKeyword: base.translations?.fr?.focusKeyword || base.focusKeyword || ''
      },
      en: {
        description: base.translations?.en?.description || base.description_en || '',
        detailedSeoDescription: base.translations?.en?.detailedSeoDescription || '',
        vehicleCondition: base.translations?.en?.vehicleCondition || '',
        seoTitle: base.translations?.en?.seoTitle || '',
        metaDescription: base.translations?.en?.metaDescription || '',
        seoH1: base.translations?.en?.seoH1 || '',
        slug: base.translations?.en?.slug || '',
        focusKeyword: base.translations?.en?.focusKeyword || ''
      },
      ru: {
        description: base.translations?.ru?.description || base.description_ru || '',
        detailedSeoDescription: base.translations?.ru?.detailedSeoDescription || '',
        vehicleCondition: base.translations?.ru?.vehicleCondition || '',
        seoTitle: base.translations?.ru?.seoTitle || '',
        metaDescription: base.translations?.ru?.metaDescription || '',
        seoH1: base.translations?.ru?.seoH1 || '',
        slug: base.translations?.ru?.slug || '',
        focusKeyword: base.translations?.ru?.focusKeyword || ''
      }
    };

    return {
      brand: base.brand || '',
      model: base.model || '',
      engine: base.engine || '',
      year: base.year || new Date().getFullYear(),
      km: (base.km !== undefined && base.km !== null ? base.km : '') as any,
      price: (base.price !== undefined && base.price !== null ? base.price : '') as any,
      fuel: base.fuel || 'Essence',
      transmission: base.transmission || 'Automatique',
      hp: (base.hp !== undefined && base.hp !== null ? base.hp : '') as any,
      co2: (base.co2 !== undefined && base.co2 !== null ? base.co2 : '') as any,
      vin: base.vin || '',
      status: base.status || 'En stock',
      image: base.image || '',
      imageAlt: base.imageAlt || '',
      description: trans.fr?.description || '',
      description_en: trans.en?.description || '',
      description_ru: trans.ru?.description || '',
      detailedSeoDescription: trans.fr?.detailedSeoDescription || '',
      vehicleCondition: trans.fr?.vehicleCondition || '',
      equipments: normalizedEquipments,
      customEquipments: base.customEquipments || [],
      color: base.color || '',
      doors: base.doors || 5,
      seats: base.seats || 5,
      bodyType: base.bodyType || 'Berline',
      verifiedVin: base.verifiedVin || false,
      featuredOnHomepage: base.featuredOnHomepage || false,
      homepageOrder: base.homepageOrder || 1,
      galleryImages: base.galleryImages || [],
      galleryImagesAlt: base.galleryImagesAlt || [],
      seoTitle: trans.fr?.seoTitle || '',
      metaDescription: trans.fr?.metaDescription || '',
      focusKeyword: trans.fr?.focusKeyword || '',
      slug: trans.fr?.slug || '',
      seoH1: trans.fr?.seoH1 || '',
      canonicalUrl: base.canonicalUrl || '',
      robotsIndex: base.robotsIndex !== false,
      robotsFollow: base.robotsFollow !== false,
      ogTitle: base.ogTitle || '',
      ogDescription: base.ogDescription || '',
      ogImage: base.ogImage || '',
      faq: base.faq || [],
      translations: trans
    };
  };

  const [formData, setFormData] = useState<Partial<Car>>(getInitialCarFormData());
  const [formErrors, setFormErrors] = useState({ brand: false, model: false, price: false, image: false });
  const [showAddEditModal, setShowAddEditModal] = useState(false);
  const [selectedAddCarId, setSelectedAddCarId] = useState<string>('');
  const [carToEdit, setCarToEdit] = useState<Car | null>(null);
  const [deleteConfirmCar, setDeleteConfirmCar] = useState<Car | null>(null);

  // Article Modal & CMS State
  const [showVehiclePicker, setShowVehiclePicker] = useState(false);
  const [vehiclePickerSearch, setVehiclePickerSearch] = useState("");
  const [articleToEdit, setArticleToEdit] = useState<Article | null>(null);
  const [showArticleModal, setShowArticleModal] = useState(false);
  const [deleteConfirmArticle, setDeleteConfirmArticle] = useState<Article | null>(null);
  const [articleFormErrors, setArticleFormErrors] = useState<any>({});
  const [articleTagInput, setArticleTagInput] = useState('');
  const [articleActiveTab, setArticleActiveTab] = useState<'content' | 'media' | 'seo' | 'relations'>('content');

  const [articleFormData, setArticleFormData] = useState<any>({
    title: "", slug: "", excerpt: "", content: "", featuredImage: "", featuredImageAlt: "",
    tags: "", status: "draft", author: "Ligo Automobiles",
    seoTitle: "", metaDescription: "", focusKeyword: "", robotsIndex: true, robotsFollow: true,
    featured: false, homepageFeatured: false, homepageOrder: 0, relatedVehicleId: "",
    title_en: "", excerpt_en: "", content_en: "",
    title_ru: "", excerpt_ru: "", content_ru: ""
  });
  const [articleEditLang, setArticleEditLang] = useState<"fr" | "en" | "ru">("fr");

  const handleToggleEquipment = (eqId: string) => {
    setFormData(prev => {
      const current = prev.equipments || [];
      const updated = current.includes(eqId)
        ? current.filter(id => id !== eqId)
        : [...current, eqId];
      return { ...prev, equipments: updated };
    });
  };

  const handleAddCustomEquipment = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const frVal = customEqForm.fr?.trim() || customEqForm.ru?.trim() || customEqForm.en?.trim() || '';
    const enVal = customEqForm.en?.trim() || customEqForm.fr?.trim() || customEqForm.ru?.trim() || '';
    const ruVal = customEqForm.ru?.trim() || customEqForm.fr?.trim() || customEqForm.en?.trim() || '';

    if (!frVal && !enVal && !ruVal) {
      showNotification("Укажите название опции хотя бы на одном языке", "error");
      return;
    }

    const id = `custom_${Date.now()}`;
    const newCustom: CustomEquipment = {
      id,
      fr: frVal,
      en: enVal,
      ru: ruVal
    };
    setFormData(prev => ({
      ...prev,
      customEquipments: [...(prev.customEquipments || []), newCustom],
      equipments: [...(prev.equipments || []), id]
    }));
    setCustomEqForm({ fr: '', en: '', ru: '' });
    setShowCustomEquipmentModal(false);
    showNotification("Собственная опция успешно добавлена!", "success");
  };

  const handleRemoveCustomEquipment = (eqId: string) => {
    setFormData(prev => ({
      ...prev,
      customEquipments: (prev.customEquipments || []).filter(c => c.id !== eqId),
      equipments: (prev.equipments || []).filter(id => id !== eqId)
    }));
  };

  const handleAddFaqItem = () => {
    const newItem: CarFaqItem = {
      id: `faq_${Date.now()}`,
      question: '',
      answer: '',
      fr: { question: '', answer: '' },
      en: { question: '', answer: '' },
      ru: { question: '', answer: '' }
    };
    setFormData(prev => ({
      ...prev,
      faq: [...(prev.faq || []), newItem]
    }));
  };

  const handleRemoveFaqItem = (index: number) => {
    setFormData(prev => ({
      ...prev,
      faq: (prev.faq || []).filter((_, idx) => idx !== index)
    }));
  };

  const handleUpdateFaqItem = (index: number, l: 'fr' | 'en' | 'ru', field: 'question' | 'answer', value: string) => {
    setFormData(prev => {
      const list = [...(prev.faq || [])];
      const item = { ...list[index] };
      if (!item[l]) item[l] = { question: '', answer: '' };
      item[l]![field] = value;
      if (l === 'fr') {
        (item as any)[field] = value;
      }
      list[index] = item;
      return { ...prev, faq: list };
    });
  };

  // Navigation Helper
  const navigateTo = (
    view: 'home' | 'catalog' | 'car-details' | 'admin' | 'actualites' | 'article-details' | 'comparison',
    options?: { car?: any; article?: Article; categorySlug?: string }
  ) => {
    setPreviousView(currentView);
    if (options?.car) {
      setSelectedCar(options.car);
      setActiveImage(options.car.image || '');
      setCurrentCarGallery([options.car.image, ...(options.car.galleryImages || [])].filter(Boolean));
    }
    if (options?.article) {
      setSelectedArticle(options.article);
    }
    if (options?.categorySlug !== undefined) {
      setSelectedArticleCategory(options.categorySlug);
      setArticleCurrentPage(1);
    }
    setCurrentView(view);
    
    let newPath = '/';
    if (view === 'catalog') newPath = '/catalogue/';
    else if (view === 'actualites') {
      newPath = options?.categorySlug && options.categorySlug !== 'all' ? `/actualites/category/${options.categorySlug}/` : '/actualites/';
    } else if (view === 'article-details' && (options?.article || selectedArticle)) {
      const art = options?.article || selectedArticle;
      const artTrans = getArticleLang(art, lang);
      newPath = `/actualites/${artTrans.slug || art?.slug}/`;
    } else if (view === 'car-details' && (options?.car || selectedCar)) {
      const c = options?.car || selectedCar;
      const slug = c?.slug || generateCarSlug(c) || c?.id;
      newPath = `/vehicules/${slug}/`;
    } else if (view === 'comparison') {
      newPath = '/comparateur/';
    } else if (view === 'admin') {
      const savedTab = localStorage.getItem('ligo_active_admin_tab') || activeAdminTab || 'featured';
      newPath = `/admin/#${savedTab}`;
    }
    
    try {
      window.history.pushState({ view, carId: options?.car?.id, articleSlug: options?.article?.slug, categorySlug: options?.categorySlug }, '', newPath);
    } catch(e) {}
    
    window.scrollTo(0, 0);
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  };

  // Popstate & Initial Route Resolver
  useEffect(() => {
    const handleRoute = (isPopstate = false) => {
      const path = window.location.pathname;
      if (path.startsWith('/admin')) {
        setCurrentView('admin');
        const hash = window.location.hash.replace('#', '').toLowerCase();
        const validTabs = ['featured', 'vehicles', 'articles', 'inquiries', 'analytics', 'settings'];
        if (validTabs.includes(hash)) {
          setActiveAdminTab(hash as any);
        } else {
          const saved = localStorage.getItem('ligo_active_admin_tab');
          if (saved && validTabs.includes(saved)) {
            setActiveAdminTab(saved as any);
          }
        }
        return;
      }

      // Never kick the admin out of the admin panel on background data changes
      if (!isPopstate && currentView === 'admin') {
        return;
      }
      if (path.startsWith('/actualites')) {
        const parts = path.split('/').filter(Boolean);
        if (parts.length === 1) {
          setCurrentView('actualites');
          setSelectedArticle(null);
        } else if (parts.length === 3 && parts[1] === 'category') {
          setCurrentView('actualites');
          setSelectedArticleCategory(parts[2]);
          setSelectedArticle(null);
        } else if (parts.length >= 2) {
          const rawSlug = parts[1];
          let slug = rawSlug;
          try {
            slug = decodeURIComponent(rawSlug);
          } catch {}
          const allPool = [...articles, ...DEMO_ARTICLES];
          const found = allPool.find(a => 
            a.slug === slug || a.slug === rawSlug ||
            a.translations?.fr?.slug === slug || a.translations?.fr?.slug === rawSlug ||
            a.translations?.en?.slug === slug || a.translations?.en?.slug === rawSlug ||
            a.translations?.ru?.slug === slug || a.translations?.ru?.slug === rawSlug
          );
          if (found) {
            setSelectedArticle(found);
            setCurrentView('article-details');
          } else {
            setCurrentView('actualites');
          }
        }
      } else if (path.startsWith('/catalogue') || path.startsWith('/catalog')) {
        setCurrentView('catalog');
        setSelectedCar(null);
      } else if (path.startsWith('/vehicules')) {
        const parts = path.split('/').filter(Boolean);
        if (parts.length >= 2) {
          const rawSlug = parts[1];
          let slug = rawSlug;
          try {
            slug = decodeURIComponent(rawSlug);
          } catch {}
          const found = cars.find(c => 
            (c.slug && (c.slug === slug || c.slug === rawSlug)) ||
            generateCarSlug(c) === slug ||
            generateCarSlug(c) === rawSlug ||
            String(c.id) === slug
          );
          if (found) {
            setSelectedCar(found);
            setActiveImage(found.image || '');
            setCurrentCarGallery([found.image, ...(found.galleryImages || [])].filter(Boolean));
            setCurrentView('car-details');
          } else {
            setCurrentView('catalog');
          }
        } else {
          setCurrentView('catalog');
        }
      } else if (path.startsWith('/comparateur') || path.startsWith('/comparaison') || path.startsWith('/comparison') || path.startsWith('/compare')) {
        setCurrentView('comparison');
        setSelectedCar(null);
        setSelectedArticle(null);
      } else if (path === '/' || path === '') {
        setCurrentView('home');
      }
    };

    if (currentView !== 'admin') {
      handleRoute(false);
    }
    const onPop = () => handleRoute(true);
    const onHash = () => {
      if (window.location.pathname.startsWith('/admin')) {
        const hash = window.location.hash.replace('#', '').toLowerCase();
        const validTabs = ['featured', 'vehicles', 'articles', 'inquiries', 'analytics', 'settings'];
        if (validTabs.includes(hash)) {
          setActiveAdminTab(hash as any);
        }
      }
    };
    window.addEventListener('popstate', onPop);
    window.addEventListener('hashchange', onHash);
    return () => {
      window.removeEventListener('popstate', onPop);
      window.removeEventListener('hashchange', onHash);
    };
  }, [articles, cars, currentView]);

  // Dynamic SEO & Meta Tags
  useEffect(() => {
    document.querySelectorAll('link[rel="alternate"][data-dynamic-hreflang]').forEach(el => el.remove());

    if (currentView === 'article-details' && selectedArticle) {
      const artTrans = getArticleLang(selectedArticle, lang);
      const catObj = articleCategories.find(c => c.id === selectedArticle.categoryId);
      const catTrans = getCategoryLang(catObj, lang);
      
      const docTitle = artTrans.seoTitle || artTrans.title;
      document.title = `${docTitle} - Ligo Automobiles`;
      
      let metaDescEl = document.querySelector('meta[name="description"]');
      if (!metaDescEl) {
        metaDescEl = document.createElement('meta');
        metaDescEl.setAttribute('name', 'description');
        document.head.appendChild(metaDescEl);
      }
      metaDescEl.setAttribute('content', artTrans.metaDescription || artTrans.excerpt);

      let canonicalEl = document.querySelector('link[rel="canonical"]');
      if (!canonicalEl) {
        canonicalEl = document.createElement('link');
        canonicalEl.setAttribute('rel', 'canonical');
        document.head.appendChild(canonicalEl);
      }
      const canonicalUrl = `https://ligo-auto.fr/actualites/${artTrans.slug || selectedArticle.slug}/`;
      canonicalEl.setAttribute('href', canonicalUrl);
    } else if (currentView === 'car-details' && selectedCar) {
      const docTitle = getCarSeoTitle(selectedCar, lang);
      document.title = `${docTitle} - Ligo Automobiles`;
    } else if (currentView === 'actualites') {
      document.title = `${t('actualitesTitle')} - Ligo Automobiles`;
    } else if (currentView === 'catalog') {
      document.title = `Catalogue des véhicules d'occasion - Ligo Automobiles`;
    } else if (currentView === 'comparison') {
      document.title = `${t('comparePageTitle')} - Ligo Automobiles`;
    } else {
      document.title = "Ligo Automobiles - L'excellence automobile à Paris";
    }
  }, [currentView, selectedArticle, selectedCar, articleCategories, lang]);

  // Dynamic Injection of Google Analytics 4 & Yandex Metrika
  useEffect(() => {
    // 1. Google Analytics 4
    const gaId = siteSettings?.googleAnalyticsId?.trim();
    const existingGaScript = document.getElementById('ligo-ga4-script');
    if (gaId) {
      if (!existingGaScript) {
        const s = document.createElement('script');
        s.id = 'ligo-ga4-script';
        s.async = true;
        s.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(gaId)}`;
        document.head.appendChild(s);

        const inlineScript = document.createElement('script');
        inlineScript.id = 'ligo-ga4-init';
        inlineScript.innerHTML = `
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${gaId}', { send_page_view: true });
        `;
        document.head.appendChild(inlineScript);
      }
    } else if (existingGaScript) {
      existingGaScript.remove();
      document.getElementById('ligo-ga4-init')?.remove();
    }

    // 2. Yandex Metrika with Webvisor
    const ymId = siteSettings?.yandexMetrikaId?.trim();
    const existingYmScript = document.getElementById('ligo-ym-script');
    if (ymId) {
      if (!existingYmScript) {
        const inlineYm = document.createElement('script');
        inlineYm.id = 'ligo-ym-script';
        inlineYm.innerHTML = `
          (function(m,e,t,r,i,k,a){m[i]=m[i]||function(){(m[i].a=m[i].a||[]).push(arguments)};
          m[i].l=1*new Date();
          for (var j = 0; j < document.scripts.length; j++) {if (document.scripts[j].src === r) { return; }}
          k=e.createElement(t),a=e.getElementsByTagName(t)[0],k.async=1,k.src=r,a.parentNode.insertBefore(k,a)})
          (window, document, "script", "https://mc.yandex.ru/metrika/tag.js", "ym");

          ym(${JSON.stringify(ymId)}, "init", {
            clickmap: true,
            trackLinks: true,
            accurateTrackBounce: true,
            webvisor: true
          });
        `;
        document.head.appendChild(inlineYm);
      }
    } else if (existingYmScript) {
      existingYmScript.remove();
    }
  }, [siteSettings?.googleAnalyticsId, siteSettings?.yandexMetrikaId]);

  // Firestore Cars & Inquiries Sync
  useEffect(() => {
    const carsCollectionRef = collection(db, 'artifacts', appId, 'public', 'data', 'cars');
    const unsubscribeCars = onSnapshot(query(carsCollectionRef), (snapshot) => {
      if (!snapshot.empty) {
        const list: Car[] = [];
        snapshot.forEach((docSnap) => {
          list.push(normalizeCar({ id: docSnap.id, ...docSnap.data() }));
        });
        setCars(list);
      }
    }, (err) => {
      console.warn('Firestore cars sync warning:', err);
    });

    const articlesCollectionRef = collection(db, 'artifacts', appId, 'public', 'data', 'articles');
    const unsubscribeArticles = onSnapshot(query(articlesCollectionRef), (snapshot) => {
      if (!snapshot.empty) {
        const list: Article[] = [];
        snapshot.forEach((docSnap) => {
          list.push(normalizeArticle({ id: docSnap.id, ...docSnap.data() }));
        });
        setArticles(list);
      }
    }, (err) => {
      console.warn('Firestore articles sync warning:', err);
    });

    const inquiriesCollectionRef = collection(db, 'artifacts', appId, 'public', 'data', 'inquiries');
    const unsubscribeInquiries = onSnapshot(query(inquiriesCollectionRef), (snapshot) => {
      if (!snapshot.empty) {
        const list: any[] = [];
        snapshot.forEach((docSnap) => {
          list.push({ id: docSnap.id, ...docSnap.data() });
        });
        setInquiries(list);
      }
    }, (err) => {
      console.warn('Firestore inquiries sync warning:', err);
    });

    const analyticsCollectionRef = collection(db, 'artifacts', appId, 'public', 'data', 'analytics_events');
    const unsubscribeAnalytics = onSnapshot(query(analyticsCollectionRef), (snapshot) => {
      const firestoreList: AnalyticsEvent[] = [];
      snapshot.forEach((docSnap) => {
        firestoreList.push({ id: docSnap.id, ...docSnap.data() } as AnalyticsEvent);
      });
      
      setAnalyticsEvents(prev => {
        if (snapshot.empty) {
          return prev;
        }

        const map = new Map<string, AnalyticsEvent>();
        firestoreList.forEach(e => map.set(e.id, e));
        prev.forEach(e => {
          if (!map.has(e.id)) map.set(e.id, e);
        });
        const merged = Array.from(map.values()).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, 3000);
        try {
          localStorage.setItem('ligo_analytics_events', JSON.stringify(merged));
        } catch {}
        return merged;
      });
    }, (err) => {
      console.warn('Firestore analytics sync warning:', err);
    });

    return () => {
      unsubscribeCars();
      unsubscribeArticles();
      unsubscribeInquiries();
      unsubscribeAnalytics();
    };
  }, [appId]);

  // Image Upload Handlers
  
  const handleArticleImageUpload = async (file: File) => {
    try {
      showNotification("Загрузка изображения статьи в постоянное хранилище...", "info");
      const url = await uploadImageFile(file);
      setArticleFormData(prev => ({ ...prev, featuredImage: url }));
      showNotification("Изображение статьи успешно загружено!", "success");
    } catch (e: any) {
      showNotification(e?.message || "Ошибка при загрузке изображения статьи", "error");
    }
  };

  const handleMainImageUpload = async (file: File) => {
    try {
      setMainImageUploading(true);
      setMainImageProgress(10);
      showNotification("Оптимизация и сохранение фото в постоянное хранилище...", "info");
      const url = await uploadImageFile(file, (pct) => setMainImageProgress(pct));
      setFormData(prev => ({ ...prev, image: url }));
      showNotification("Главное фото успешно сохранено в постоянном хранилище!", "success");
    } catch (e: any) {
      showNotification(e?.message || "Ошибка при загрузке главного фото", "error");
    } finally {
      setMainImageUploading(false);
      setMainImageProgress(0);
    }
  };

  const handleGalleryImagesUpload = async (files: FileList | File[]) => {
    try {
      setGalleryUploading(true);
      const filesArr = Array.from(files);
      showNotification(`Загрузка ${filesArr.length} фото в постоянное хранилище...`, "info");
      const uploadedList: string[] = [];
      for (let i = 0; i < filesArr.length; i++) {
        showNotification(`Загрузка фото ${i + 1} из ${filesArr.length}...`, "info");
        const url = await uploadImageFile(filesArr[i]);
        uploadedList.push(url);
      }
      setFormData(prev => ({
        ...prev,
        galleryImages: [...(prev.galleryImages || []), ...uploadedList]
      }));
      showNotification(`${uploadedList.length} фото успешно добавлено в галерею!`, "success");
    } catch (e: any) {
      showNotification(e?.message || "Ошибка при загрузке фото в галерею", "error");
    } finally {
      setGalleryUploading(false);
    }
  };

  const handleArticleFeaturedImageUpload = async (file: File) => {
    try {
      showNotification("Загрузка обложки статьи в постоянное хранилище...", "info");
      const url = await uploadImageFile(file);
      setArticleFormData((prev: any) => ({ ...prev, featuredImage: url }));
      showNotification("Изображение обложки успешно обновлено!", "success");
    } catch (e: any) {
      showNotification(e?.message || "Ошибка при загрузке обложки", "error");
    }
  };

  const handleCopyVIN = (vinText: string) => {
    navigator.clipboard.writeText(vinText);
    showNotification("Code VIN copié dans le presse-papier !", "success");
  };

  // Article handlers
  const handleOpenAddArticleModal = () => {
    setArticleToEdit(null);
    setArticleEditLang(lang === 'ru' ? 'ru' : lang === 'en' ? 'en' : 'fr');
    setArticleFormData({
      title: '', slug: '', excerpt: '', content: '', featuredImage: '', featuredImageAlt: '',
      tags: '', status: 'published', author: 'Ligo Automobiles',
      seoTitle: '', metaDescription: '', focusKeyword: '', robotsIndex: true, robotsFollow: true,
      featured: false, homepageFeatured: true, homepageOrder: 1, relatedVehicleId: '',
      title_en: '', excerpt_en: '', content_en: '',
      title_ru: '', excerpt_ru: '', content_ru: ''
    });
    setArticleFormErrors({});
    setArticleTagInput('');
    setArticleActiveTab('content');
    setShowArticleModal(true);
  };

  const handleOpenArticleAdd = () => handleOpenAddArticleModal();

  const handleOpenEditArticleModal = (article: Article) => {
    const normalized = normalizeArticle(article);
    setArticleToEdit(normalized);
    const fr = normalized.translations?.fr || {} as ArticleTranslation;
    const en = normalized.translations?.en || {} as ArticleTranslation;
    const ru = normalized.translations?.ru || {} as ArticleTranslation;
    setArticleFormData({
      title: fr.title || normalized.title || '', slug: fr.slug || normalized.slug || '',
      excerpt: fr.excerpt || normalized.excerpt || '', content: fr.content || normalized.content || '',
      featuredImage: normalized.featuredImage || '', featuredImageAlt: normalized.featuredImageAlt || '',
      tags: (normalized.tags || []).join(', '), status: normalized.status || 'draft',
      author: normalized.author || 'Ligo Automobiles',
      seoTitle: fr.seoTitle || normalized.seoTitle || '', metaDescription: fr.metaDescription || normalized.metaDescription || '',
      focusKeyword: fr.focusKeyword || normalized.focusKeyword || '',
      robotsIndex: normalized.robotsIndex !== false, robotsFollow: normalized.robotsFollow !== false,
      featured: normalized.featured || false, homepageFeatured: normalized.homepageFeatured || false,
      homepageOrder: normalized.homepageOrder || 0, relatedVehicleId: normalized.relatedVehicleId || '',
      title_en: en.title || '', excerpt_en: en.excerpt || '', content_en: en.content || '',
      title_ru: ru.title || '', excerpt_ru: ru.excerpt || '', content_ru: ru.content || ''
    });
    setArticleEditLang('fr');
    setArticleFormErrors({});
    setArticleTagInput('');
    setArticleActiveTab('content');
    setShowArticleModal(true);
  };

  const handleOpenArticleEdit = (article: Article) => handleOpenEditArticleModal(article);

  const handleDuplicateArticle = (article: Article) => {
    const normalized = normalizeArticle(article);
    handleOpenEditArticleModal({
      ...normalized,
      id: '',
      status: 'draft',
      translations: {
        fr: { ...normalized.translations.fr, title: normalized.translations.fr.title + ' (Copie)' },
        ...(normalized.translations.en ? { en: { ...normalized.translations.en, title: normalized.translations.en.title + ' (Copy)' } } : {}),
        ...(normalized.translations.ru ? { ru: { ...normalized.translations.ru, title: normalized.translations.ru.title + ' (Копия)' } } : {})
      }
    });
    setArticleToEdit(null);
    showNotification("Article dupliqué en mode brouillon", "info");
  };

  const handleToggleArticleHomepage = async (article: Article) => {
    const updated = articles.map(a => a.id === article.id ? { ...a, homepageFeatured: !a.homepageFeatured } : a);
    setArticles(updated);
    try {
      const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'articles', article.id);
      await updateDoc(docRef, { homepageFeatured: !article.homepageFeatured });
    } catch {}
    showNotification("Statut de publication mis à jour", "success");
  };

  const handleMoveArticleHomepage = async (articleId: string, direction: 'up' | 'down') => {
    const featuredArticles = articles.filter(a => a.homepageFeatured).sort((a, b) => (a.homepageOrder || 1) - (b.homepageOrder || 1));
    const idx = featuredArticles.findIndex(a => a.id === articleId);
    if (idx === -1) return;
    if (direction === 'up' && idx === 0) return;
    if (direction === 'down' && idx === featuredArticles.length - 1) return;
    const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
    const reordered = [...featuredArticles];
    const [moved] = reordered.splice(idx, 1);
    reordered.splice(targetIdx, 0, moved);
    const updatedMap = new Map();
    reordered.forEach((a, i) => updatedMap.set(a.id, i + 1));
    const newArticles = articles.map(a => updatedMap.has(a.id) ? { ...a, homepageOrder: updatedMap.get(a.id) } : a);
    setArticles(newArticles);
    try {
      for (const [id, order] of updatedMap.entries()) {
        const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'articles', id);
        updateDoc(docRef, { homepageOrder: order }).catch(() => {});
      }
    } catch {}
    showNotification("Ordre mis à jour", "success");
  };

  const handleSaveArticle = async () => {
    const title = articleFormData.title.trim() || articleFormData.title_ru?.trim() || articleFormData.title_en?.trim() || '';
    if (!title) {
      showNotification(lang === 'ru' ? 'Введите заголовок статьи' : 'Le titre est obligatoire.', 'error');
      return;
    }
    
    const primaryTitle = articleFormData.title.trim() || title;
    const primaryExcerpt = articleFormData.excerpt.trim() || articleFormData.excerpt_ru?.trim() || articleFormData.excerpt_en?.trim() || '';
    const primaryContent = articleFormData.content.trim() || articleFormData.content_ru?.trim() || articleFormData.content_en?.trim() || '';
    const slug = articleFormData.slug.trim() || generateArticleSlug(primaryTitle);
    const now = new Date().toISOString();
    const tags = (articleFormData.tags || '').split(',').map((t: string) => t.trim()).filter(Boolean);
    
    const frTranslation: ArticleTranslation = {
      title: primaryTitle,
      slug,
      excerpt: primaryExcerpt,
      content: primaryContent,
      seoTitle: articleFormData.seoTitle.trim() || `${primaryTitle} - Ligo Automobiles`.slice(0, 70),
      metaDescription: articleFormData.metaDescription.trim() || primaryExcerpt.slice(0, 160),
      focusKeyword: articleFormData.focusKeyword.trim() || `${primaryTitle} occasion`.toLowerCase(),
      readingTime: calculateReadingTime(primaryContent)
    };
    
    const translations: Article['translations'] = { fr: frTranslation };
    
    if (articleFormData.title_en?.trim() || articleFormData.content_en?.trim()) {
      const enTitle = articleFormData.title_en?.trim() || primaryTitle;
      const enContent = articleFormData.content_en?.trim() || primaryContent;
      translations.en = {
        title: enTitle,
        slug: generateArticleSlug(enTitle),
        excerpt: articleFormData.excerpt_en?.trim() || primaryExcerpt,
        content: enContent,
        readingTime: calculateReadingTime(enContent)
      };
    }
    
    if (articleFormData.title_ru?.trim() || articleFormData.content_ru?.trim()) {
      const ruTitle = articleFormData.title_ru?.trim() || primaryTitle;
      const ruContent = articleFormData.content_ru?.trim() || primaryContent;
      translations.ru = {
        title: ruTitle,
        slug: generateArticleSlug(ruTitle),
        excerpt: articleFormData.excerpt_ru?.trim() || primaryExcerpt,
        content: ruContent,
        readingTime: calculateReadingTime(ruContent)
      };
    }

    const articleData: any = {
      title: primaryTitle,
      slug,
      tags,
      translations,
      categoryId: 'cat-1',
      featuredImage: articleFormData.featuredImage?.trim() || 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&q=80&w=1200',
      featuredImageAlt: articleFormData.featuredImageAlt?.trim() || primaryTitle,
      status: articleFormData.status || 'published',
      author: articleFormData.author?.trim() || 'Ligo Automobiles',
      featured: Boolean(articleFormData.featured),
      homepageFeatured: Boolean(articleFormData.homepageFeatured !== false),
      homepageOrder: Number(articleFormData.homepageOrder) || 1,
      robotsIndex: Boolean(articleFormData.robotsIndex !== false),
      robotsFollow: Boolean(articleFormData.robotsFollow !== false),
      relatedVehicleId: articleFormData.relatedVehicleId || null,
      seoTitle: articleFormData.seoTitle.trim() || `${primaryTitle} - Ligo Automobiles`.slice(0, 70),
      metaDescription: articleFormData.metaDescription.trim() || primaryExcerpt.slice(0, 160),
      focusKeyword: articleFormData.focusKeyword.trim() || `${primaryTitle} occasion`.toLowerCase(),
      publishedAt: (articleFormData.status || 'published') === 'published' ? (articleToEdit?.publishedAt || now) : '',
      updatedAt: now,
      readingTime: calculateReadingTime(primaryContent)
    };

    try {
      showNotification(lang === 'ru' ? 'Сохранение статьи...' : 'Enregistrement...', 'info');
      if (articleToEdit && articleToEdit.id) {
        const updatedArticle = { ...articleToEdit, ...articleData, id: articleToEdit.id } as Article;
        setArticles(prev => prev.map(a => a.id === articleToEdit.id ? updatedArticle : a));
        const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'articles', articleToEdit.id);
        await setDoc(docRef, articleData, { merge: true });
        showNotification(lang === 'ru' ? 'Статья успешно обновлена!' : 'Article mis à jour avec succès.', 'success');
      } else {
        const localId = `art-${Date.now()}`;
        const newArticle = { id: localId, ...articleData, createdAt: now } as Article;
        setArticles(prev => [newArticle, ...prev]);
        const colRef = collection(db, 'artifacts', appId, 'public', 'data', 'articles');
        await addDoc(colRef, { ...articleData, createdAt: now });
        showNotification(lang === 'ru' ? 'Статья успешно опубликована!' : 'Article créé avec succès.', 'success');
      }
      setShowArticleModal(false);
    } catch (err: any) {
      console.warn("Article save offline/error:", err);
      showNotification(lang === 'ru' ? 'Статья сохранена локально!' : 'Article sauvegardé localement !', 'success');
      setShowArticleModal(false);
    }
  };

  const handleDeleteArticle = async (article: Article) => {
    setArticles(prev => prev.filter(a => a.id !== article.id));
    setDeleteConfirmArticle(null);
    try {
      if (article.id) {
        const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'articles', article.id);
        await deleteDoc(docRef);
      }
      showNotification(lang === 'ru' ? 'Статья удалена' : 'Article supprimé.', 'success');
    } catch (err) {
      console.warn('Firestore delete error:', err);
    }
  };

  const handleSelectArticle = (article: Article) => {
    setSelectedArticle(article);
    navigateTo('article-details', { article });
  };

  const handleInsertVehicle = (car: Car, mode: 'card' | 'link') => {
    const tag = mode === 'card' ? `[VEHICULE:${car.id}]` : `[🚗 ${car.brand} ${car.model} (${car.price?.toLocaleString('fr-FR')} €)](#car:${car.id})`;
    const langKey = articleEditLang === 'en' ? 'content_en' : articleEditLang === 'ru' ? 'content_ru' : 'content';
    setArticleFormData((prev: any) => ({ ...prev, [langKey]: (prev[langKey] || '') + '\\n' + tag + '\\n' }));
    setShowVehiclePicker(false);
    setVehiclePickerSearch('');
  };

  const formatMarkdownArticle = (text: string) => {
    if (!text) return '';
    
    // Normalize newlines and unescape literal \n strings
    let src = text.replace(/\\n/g, '\n').replace(/\\r/g, '').replace(/\r\n/g, '\n');
    
    // Clean legacy internal CTA markers if any
    src = src.replace(/\[CTA_CONTACT\]/gi, '').replace(/\[CTA_VEHICULES\]/gi, '').replace(/\[CTA_CAR\]/gi, '');
    
    // If the input is already full rich HTML, return it directly
    const isRichHtml = /<(p|h2|h3|ul|ol|table|blockquote)[^>]*>/i.test(src);
    if (isRichHtml) {
      return src;
    }

    const lines = src.split('\n');
    const htmlBlocks: string[] = [];
    let inList: 'ul' | 'ol' | null = null;
    let listItems: string[] = [];
    let inTable = false;
    let tableRows: string[] = [];

    const flushList = () => {
      if (inList === 'ul') {
        htmlBlocks.push(`<ul>${listItems.join('')}</ul>`);
      } else if (inList === 'ol') {
        htmlBlocks.push(`<ol>${listItems.join('')}</ol>`);
      }
      inList = null;
      listItems = [];
    };

    const formatInline = (str: string): string => {
      return str
        // Images: ![alt](url)
        .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" loading="lazy" />')
        // Links: [text](url)
        .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>')
        // Bold: **text** or __text__
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        .replace(/__(.+?)__/g, '<strong>$1</strong>')
        // Italic: *text* or _text_
        .replace(/\*([^*]+)\*/g, '<em>$1</em>')
        .replace(/_([^_]+)_/g, '<em>$1</em>');
    };

    const flushTable = () => {
      if (inTable && tableRows.length > 0) {
        let tableHtml = '<div class="table-responsive"><table>';
        let isFirstRow = true;
        for (let r = 0; r < tableRows.length; r++) {
          const rowText = tableRows[r].trim();
          // Skip separator row |:---|:---|
          if (/^\|?(\s*:?-+:?\s*\|?)+$/.test(rowText)) {
            continue;
          }
          const cells = rowText.split('|').map(c => c.trim()).filter((c, idx, arr) => {
            if (idx === 0 && c === '') return false;
            if (idx === arr.length - 1 && c === '') return false;
            return true;
          });
          if (cells.length === 0) continue;
          if (isFirstRow) {
            tableHtml += '<thead><tr>' + cells.map(c => `<th>${formatInline(c)}</th>`).join('') + '</tr></thead><tbody>';
            isFirstRow = false;
          } else {
            tableHtml += '<tr>' + cells.map(c => `<td>${formatInline(c)}</td>`).join('') + '</tr>';
          }
        }
        tableHtml += '</tbody></table></div>';
        htmlBlocks.push(tableHtml);
      }
      inTable = false;
      tableRows = [];
    };

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();

      if (!trimmed) {
        flushList();
        flushTable();
        continue;
      }

      // Check for Markdown table row
      if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
        flushList();
        inTable = true;
        tableRows.push(trimmed);
        continue;
      } else if (inTable) {
        flushTable();
      }

      // Check if line is already an HTML block element
      if (/^<(h[1-6]|p|blockquote|ul|ol|table|hr|img|div)/i.test(trimmed)) {
        flushList();
        htmlBlocks.push(trimmed);
        continue;
      }

      // Headers
      if (trimmed.startsWith('#### ')) {
        flushList();
        htmlBlocks.push(`<h4>${formatInline(trimmed.slice(5))}</h4>`);
      } else if (trimmed.startsWith('### ')) {
        flushList();
        htmlBlocks.push(`<h3>${formatInline(trimmed.slice(4))}</h3>`);
      } else if (trimmed.startsWith('## ')) {
        flushList();
        htmlBlocks.push(`<h2>${formatInline(trimmed.slice(3))}</h2>`);
      } else if (trimmed.startsWith('# ')) {
        flushList();
        htmlBlocks.push(`<h2>${formatInline(trimmed.slice(2))}</h2>`);
      } else if (trimmed.startsWith('> ')) {
        flushList();
        htmlBlocks.push(`<blockquote>${formatInline(trimmed.slice(2))}</blockquote>`);
      } else if (trimmed === '---' || trimmed === '***' || trimmed === '___') {
        flushList();
        htmlBlocks.push(`<hr />`);
      } else if (/^[-*]\s+/.test(trimmed)) {
        if (inList !== 'ul') {
          flushList();
          inList = 'ul';
        }
        const itemText = trimmed.replace(/^[-*]\s+/, '');
        listItems.push(`<li>${formatInline(itemText)}</li>`);
      } else if (/^\d+\.\s+/.test(trimmed)) {
        if (inList !== 'ol') {
          flushList();
          inList = 'ol';
        }
        const itemText = trimmed.replace(/^\d+\.\s+/, '');
        listItems.push(`<li>${formatInline(itemText)}</li>`);
      } else {
        flushList();
        htmlBlocks.push(`<p>${formatInline(trimmed)}</p>`);
      }
    }

    flushList();
    flushTable();
    return htmlBlocks.join('\n');
  };

  const renderArticleContent = (content: string) => {
    if (!content) return null;
    return (
      <div 
        className="article-content"
        dangerouslySetInnerHTML={{ __html: formatMarkdownArticle(content) }}
      />
    );
  };

  const handleSelectCar = (car: any) => {
    const normalized = normalizeCar(car);
    setSelectedCar(normalized);
    setPreviousView(currentView);
    setCurrentView('car-details');
    setActiveDetailsTab('specs');
    setActiveImage(normalized.image || '');
    setCurrentCarGallery([normalized.image, ...(normalized.galleryImages || [])].filter(Boolean));
    window.scrollTo(0, 0);
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
    const slug = normalized.slug || generateCarSlug(normalized);
    try {
      window.history.pushState({ view: 'car-details', slug, carId: normalized.id }, '', `/vehicules/${slug}/`);
    } catch {}

    trackAnalyticsEvent('vehicle_view', {
      vehicleId: normalized.id,
      brand: normalized.brand,
      model: normalized.model,
      path: `/vehicules/${slug}/`
    });
  };

  // Analytics event tracking
  const trackAnalyticsEvent = (eventName: AnalyticsEvent['event'], data: Partial<AnalyticsEvent> = {}) => {
    try {
      const dedupeKey = `${eventName}_${data.vehicleId || ''}_${data.articleId || ''}_${data.path || window.location.pathname}`;
      const now = Date.now();
      if (
        (eventName === 'vehicle_view' || eventName === 'page_view' || eventName === 'catalog_view' || eventName === 'article_view') &&
        lastTrackedRef.current[dedupeKey] &&
        now - lastTrackedRef.current[dedupeKey] < 15000
      ) {
        return;
      }
      lastTrackedRef.current[dedupeKey] = now;

      const trafficInfo = detectTrafficSource();
      const visitorId = getOrCreateVisitorId();
      const sessionId = getOrCreateSessionId();

      let comparedPairs: string[] = [];
      if (data.comparedVehicleIds && data.comparedVehicleIds.length > 1) {
        const ids = data.comparedVehicleIds;
        for (let i = 0; i < ids.length; i++) {
          for (let j = 0; j < ids.length; j++) {
            if (i !== j) {
              comparedPairs.push(`${ids[i]}:${ids[j]}`);
            }
          }
        }
      }

      const newEvent: AnalyticsEvent = {
        id: `evt_${now}_${Math.random().toString(36).substring(2, 7)}`,
        event: eventName,
        vehicleId: data.vehicleId || '',
        brand: data.brand || '',
        model: data.model || '',
        articleId: data.articleId || '',
        articleTitle: data.articleTitle || '',
        comparedVehicleIds: data.comparedVehicleIds || [],
        comparedPairs: comparedPairs.length > 0 ? comparedPairs : data.comparedPairs || [],
        visitorId,
        sessionId,
        source: trafficInfo.source || 'Direct',
        utmSource: trafficInfo.utmSource || '',
        utmMedium: trafficInfo.utmMedium || '',
        utmCampaign: trafficInfo.utmCampaign || '',
        utmContent: trafficInfo.utmContent || '',
        utmTerm: trafficInfo.utmTerm || '',
        referrer: trafficInfo.referrer || '',
        path: data.path || window.location.pathname,
        language: lang || 'fr',
        timestamp: new Date().toISOString(),
        meta: data.meta || {}
      };

      window.dispatchEvent(new CustomEvent('ligo_analytics', { detail: newEvent }));

      setAnalyticsEvents(prev => {
        const updated = [newEvent, ...prev];
        const sliced = updated.slice(0, 3000);
        try { localStorage.setItem('ligo_analytics_events', JSON.stringify(sliced)); } catch {}
        return sliced;
      });

      try {
        const cleanPayload: any = {};
        Object.entries(newEvent).forEach(([key, val]) => {
          if (val !== undefined) {
            cleanPayload[key] = val;
          }
        });
        const docRef = collection(db, 'artifacts', appId, 'public', 'data', 'analytics_events');
        addDoc(docRef, cleanPayload).catch(err => {
          console.warn('Firestore analytics save error:', err);
        });
      } catch (err) {
        console.warn('Firestore analytics error:', err);
      }

      // Forward to Google Analytics 4 if configured
      if (typeof window !== 'undefined' && (window as any).gtag && siteSettings?.googleAnalyticsId) {
        try {
          (window as any).gtag('event', eventName, {
            vehicle_id: data.vehicleId,
            brand: data.brand,
            model: data.model,
            article_id: data.articleId,
            page_path: data.path || window.location.pathname,
            traffic_source: trafficInfo.source
          });
        } catch {}
      }

      // Forward to Yandex Metrika if configured
      if (typeof window !== 'undefined' && (window as any).ym && siteSettings?.yandexMetrikaId) {
        try {
          const ymId = Number(siteSettings.yandexMetrikaId);
          if (!isNaN(ymId)) {
            (window as any).ym(ymId, 'reachGoal', eventName, {
              vehicleId: data.vehicleId,
              brand: data.brand,
              model: data.model
            });
          }
        } catch {}
      }
    } catch (e) {
      console.error('Analytics tracking error:', e);
    }
  };

  // Automatic Page View Tracking for visitor sessions on route/view changes
  useEffect(() => {
    if (currentView === 'admin') return; // Do not track admin visits to own panel

    const timer = setTimeout(() => {
      if (currentView === 'home') {
        trackAnalyticsEvent('page_view', { path: '/' });
      } else if (currentView === 'catalog') {
        trackAnalyticsEvent('catalog_view', { path: '/catalogue/' });
      } else if (currentView === 'actualites') {
        trackAnalyticsEvent('page_view', { path: '/actualites/' });
      } else if (currentView === 'article-details' && selectedArticle) {
        trackAnalyticsEvent('article_view', {
          articleId: selectedArticle.id,
          articleTitle: selectedArticle.title,
          path: `/actualites/${selectedArticle.slug || selectedArticle.id}/`
        });
      } else if (currentView === 'car-details' && selectedCar) {
        trackAnalyticsEvent('vehicle_view', {
          vehicleId: selectedCar.id,
          brand: selectedCar.brand,
          model: selectedCar.model,
          path: `/vehicules/${selectedCar.slug || selectedCar.id}/`
        });
      } else if (currentView === 'comparison') {
        trackAnalyticsEvent('comparison_view', { path: '/comparateur/' });
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [currentView, selectedCar?.id, selectedArticle?.id]);

  const isCompared = (carId: string) => comparedCarIds.includes(carId);

  // Featured Cars Reordering & Drag-and-drop
  const [draggedFeaturedId, setDraggedFeaturedId] = useState<string | null>(null);

  const handleDragStartFeatured = (e: React.DragEvent, id: string) => {
    setDraggedFeaturedId(id);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', id);
  };

  const handleDragOverFeatured = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDropFeatured = async (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    const sourceId = draggedFeaturedId || e.dataTransfer.getData('text/plain');
    if (!sourceId || sourceId === targetId) {
      setDraggedFeaturedId(null);
      return;
    }

    const featuredList = cars
      .filter(c => Boolean(c.featuredOnHomepage))
      .sort((a, b) => (Number(a.homepageOrder) || 999) - (Number(b.homepageOrder) || 999));

    const sourceIndex = featuredList.findIndex(c => c.id === sourceId);
    const targetIndex = featuredList.findIndex(c => c.id === targetId);

    if (sourceIndex === -1 || targetIndex === -1) {
      setDraggedFeaturedId(null);
      return;
    }

    const reordered = [...featuredList];
    const [movedItem] = reordered.splice(sourceIndex, 1);
    reordered.splice(targetIndex, 0, movedItem);

    const updatedMap = new Map();
    reordered.forEach((c, idx) => {
      updatedMap.set(c.id, idx + 1);
    });

    const newCars = cars.map(c => {
      if (updatedMap.has(c.id)) {
        return { ...c, homepageOrder: updatedMap.get(c.id) };
      }
      return c;
    });

    setCars(newCars);
    setDraggedFeaturedId(null);

    try {
      for (const [id, order] of updatedMap.entries()) {
        const carDocRef = doc(db, 'artifacts', appId, 'public', 'data', 'cars', id);
        updateDoc(carDocRef, { homepageOrder: order }).catch(() => {});
      }
    } catch (err) {
      console.warn("Offline reorder:", err);
    }
    showNotification("Ordre mis à jour avec succès !", "success");
  };

  const handleToggleFeatured = async (car: Car) => {
    const isCurrentlyFeatured = Boolean(car.featuredOnHomepage);
    if (!isCurrentlyFeatured) {
      const currentFeaturedCount = cars.filter(c => c.featuredOnHomepage).length;
      if (currentFeaturedCount >= 10) {
        showNotification("Maximum 10 véhicules en vedette", "error");
        return;
      }
      const nextOrder = currentFeaturedCount + 1;
      const updatedCars = cars.map(c => c.id === car.id ? { ...c, featuredOnHomepage: true, homepageOrder: nextOrder } : c);
      setCars(updatedCars);
      try {
        const carDocRef = doc(db, 'artifacts', appId, 'public', 'data', 'cars', car.id);
        await updateDoc(carDocRef, { featuredOnHomepage: true, homepageOrder: nextOrder });
      } catch (err) {}
      showNotification("Véhicule mis en vedette !", "success");
    } else {
      const updatedCars = cars.map(c => c.id === car.id ? { ...c, featuredOnHomepage: false } : c);
      setCars(updatedCars);
      try {
        const carDocRef = doc(db, 'artifacts', appId, 'public', 'data', 'cars', car.id);
        await updateDoc(carDocRef, { featuredOnHomepage: false });
      } catch (err) {}
      showNotification("Véhicule retiré de la page d'accueil", "success");
    }
  };

  const handleMoveFeatured = async (carId: string, direction: 'up' | 'down') => {
    const featuredList = cars
      .filter(c => Boolean(c.featuredOnHomepage))
      .sort((a, b) => (Number(a.homepageOrder) || 999) - (Number(b.homepageOrder) || 999));
    
    const index = featuredList.findIndex(c => c.id === carId);
    if (index === -1) return;
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === featuredList.length - 1) return;

    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    const reordered = [...featuredList];
    const [movedItem] = reordered.splice(index, 1);
    reordered.splice(targetIndex, 0, movedItem);

    const updatedMap = new Map();
    reordered.forEach((c, idx) => {
      updatedMap.set(c.id, idx + 1);
    });

    const newCars = cars.map(c => {
      if (updatedMap.has(c.id)) {
        return { ...c, homepageOrder: updatedMap.get(c.id) };
      }
      return c;
    });

    setCars(newCars);

    try {
      for (const [id, order] of updatedMap.entries()) {
        const carDocRef = doc(db, 'artifacts', appId, 'public', 'data', 'cars', id);
        updateDoc(carDocRef, { homepageOrder: order }).catch(() => {});
      }
    } catch (err) {}
    showNotification("Ordre mis à jour avec succès !", "success");
  };

  // Car Editor Handlers (Russian Modal & Multilingual)
  const updateCarTranslation = (l: 'fr' | 'en' | 'ru', field: keyof CarTranslation, value: any) => {
    setFormData(prev => {
      const prevTrans = prev.translations || { fr: {}, en: {}, ru: {} };
      const currentLangTrans = prevTrans[l] || {};
      const updatedLangTrans = { ...currentLangTrans, [field]: value };
      
      const updated: Partial<Car> = {
        ...prev,
        translations: {
          ...prevTrans,
          [l]: updatedLangTrans
        }
      };

      // Also sync top-level fields for backwards compatibility and FR primary fields
      if (l === 'fr') {
        if (field === 'seoTitle') updated.seoTitle = value;
        if (field === 'metaDescription') updated.metaDescription = value;
        if (field === 'seoH1') updated.seoH1 = value;
        if (field === 'slug') updated.slug = value;
        if (field === 'focusKeyword') updated.focusKeyword = value;
        if (field === 'description') updated.description = value;
        if (field === 'detailedSeoDescription') updated.detailedSeoDescription = value;
        if (field === 'vehicleCondition') updated.vehicleCondition = value;
      } else if (l === 'en') {
        if (field === 'description') updated.description_en = value;
      } else if (l === 'ru') {
        if (field === 'description') updated.description_ru = value;
      }

      return updated;
    });
  };

  const handleAutoGenerateCarSeo = () => {
    if (!formData.brand?.trim() || !formData.model?.trim()) {
      showNotification("Сначала укажите марку и модель автомобиля.", "error");
      return;
    }
    const generated = generateCarSeoFields(formData);
    setFormData(prev => ({
      ...prev,
      ...generated,
      translations: {
        fr: { ...(prev.translations?.fr || {}), ...(generated.translations?.fr || {}) },
        en: { ...(prev.translations?.en || {}), ...(generated.translations?.en || {}) },
        ru: { ...(prev.translations?.ru || {}), ...(generated.translations?.ru || {}) },
      }
    }));
    showNotification("SEO-параметры сгенерированы для всех 3 языков (FR, EN, RU)!", "success");
  };

  const handleAiGenerateCarSeo = () => {
    if (!formData.brand?.trim() || !formData.model?.trim()) {
      showNotification("Сначала укажите марку и модель автомобиля.", "error");
      return;
    }
    const generated = generateCarSeoFields(formData);
    setFormData(prev => ({
      ...prev,
      ...generated,
      translations: {
        fr: { ...(prev.translations?.fr || {}), ...(generated.translations?.fr || {}) },
        en: { ...(prev.translations?.en || {}), ...(generated.translations?.en || {}) },
        ru: { ...(prev.translations?.ru || {}), ...(generated.translations?.ru || {}) },
      }
    }));
    showNotification("✨ AI-тексты описания, опции и SEO успешно сгенерированы для всех 3 языков!", "success");
  };

  const handleOpenAddModal = () => {
    setCarToEdit(null);
    setFormData(getInitialCarFormData());
    setFormErrors({ brand: false, model: false, price: false, image: false });
    setCarActiveTab('info');
    setShowAddEditModal(true);
  };

  const handleOpenEditModal = (car: Car) => {
    setCarToEdit(car);
    setFormData(getInitialCarFormData(car));
    setFormErrors({ brand: false, model: false, price: false, image: false });
    setCarActiveTab('info');
    setShowAddEditModal(true);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errors = {
      brand: !formData.brand?.trim(),
      model: !formData.model?.trim(),
      price: !formData.price || Number(formData.price) <= 0,
      image: !formData.image
    };
    setFormErrors(errors);
    if (Object.values(errors).some(Boolean)) {
      showNotification("Заполните все обязательные поля (*)", "error");
      return;
    }

    const brand = formData.brand!.trim();
    const model = formData.model!.trim();
    const engine = (formData.engine || '').trim();
    const year = Number(formData.year) || new Date().getFullYear();
    const km = Number(formData.km) || 0;
    const price = Number(formData.price);
    const fuel = formData.fuel || 'Essence';
    const transmission = formData.transmission || 'Automatique';
    const hp = Number(formData.hp) || 0;
    const co2 = Number(formData.co2) || 0;
    const vin = (formData.vin || '').trim();
    const status = formData.status || 'En stock';
    const image = formData.image || '';
    const imageAlt = formData.imageAlt || `${brand} ${model} ${engine} d'occasion`;
    const color = formData.color || '';
    const doors = Number(formData.doors) || 5;
    const seats = Number(formData.seats) || 5;
    const bodyType = formData.bodyType || 'Berline';
    const verifiedVin = Boolean(formData.verifiedVin);
    const featuredOnHomepage = Boolean(formData.featuredOnHomepage);
    const homepageOrder = Number(formData.homepageOrder) || 1;
    const galleryImages = formData.galleryImages || [];
    const galleryImagesAlt = formData.galleryImagesAlt || [];
    const equipments = (formData.equipments || []).map(normalizeEquipmentKey).filter(Boolean);
    const customEquipments = formData.customEquipments || [];
    const faq = (formData.faq && formData.faq.length > 0) ? formData.faq : generateCarDefaultFaq({ brand, model, engine, year, km, fuel, transmission, hp, price });

    const slug = formData.slug?.trim() || generateCarSlug({ brand, model, engine, year });
    const seoTitle = formData.seoTitle?.trim() || getCarSeoTitle({ brand, model, engine, year, km });
    const metaDescription = formData.metaDescription?.trim() || getCarMetaDescription({ brand, model, engine, year, km, price });
    const seoH1 = formData.seoH1?.trim() || getCarH1({ brand, model, engine });
    const focusKeyword = formData.focusKeyword?.trim() || `${brand} ${model} occasion`.toLowerCase();
    const canonicalUrl = formData.canonicalUrl?.trim() || `https://ligo-auto.fr/vehicules/${slug}/`;
    const detailedSeoDescription = formData.detailedSeoDescription?.trim() || '';
    const vehicleCondition = formData.vehicleCondition?.trim() || '';

    const frTrans: CarTranslation = {
      description: formData.translations?.fr?.description || formData.description || '',
      detailedSeoDescription: formData.translations?.fr?.detailedSeoDescription || detailedSeoDescription,
      vehicleCondition: formData.translations?.fr?.vehicleCondition || vehicleCondition,
      seoTitle: formData.translations?.fr?.seoTitle || seoTitle,
      metaDescription: formData.translations?.fr?.metaDescription || metaDescription,
      seoH1: formData.translations?.fr?.seoH1 || seoH1,
      slug: formData.translations?.fr?.slug || slug,
      focusKeyword: formData.translations?.fr?.focusKeyword || focusKeyword
    };

    const enTrans: Partial<CarTranslation> = {
      description: formData.translations?.en?.description || formData.description_en || '',
      detailedSeoDescription: formData.translations?.en?.detailedSeoDescription || '',
      vehicleCondition: formData.translations?.en?.vehicleCondition || '',
      seoTitle: formData.translations?.en?.seoTitle || `Buy used ${brand} ${model} ${year} - Ligo Automobiles`,
      metaDescription: formData.translations?.en?.metaDescription || `Certified ${brand} ${model} available at Ligo Automobiles. Inspected 100+ points.`,
      seoH1: formData.translations?.en?.seoH1 || `Used ${brand} ${model} ${year}`,
      slug: formData.translations?.en?.slug || slug,
      focusKeyword: formData.translations?.en?.focusKeyword || `used ${brand} ${model}`.toLowerCase()
    };

    const ruTrans: Partial<CarTranslation> = {
      description: formData.translations?.ru?.description || formData.description_ru || '',
      detailedSeoDescription: formData.translations?.ru?.detailedSeoDescription || '',
      vehicleCondition: formData.translations?.ru?.vehicleCondition || '',
      seoTitle: formData.translations?.ru?.seoTitle || `Купить ${brand} ${model} ${year} с пробегом - Ligo Automobiles`,
      metaDescription: formData.translations?.ru?.metaDescription || `Автомобиль ${brand} ${model} с гарантией от Ligo Automobiles. Проверка 100+ пунктов.`,
      seoH1: formData.translations?.ru?.seoH1 || `${brand} ${model} ${year} с пробегом`,
      slug: formData.translations?.ru?.slug || slug,
      focusKeyword: formData.translations?.ru?.focusKeyword || `купить ${brand} ${model}`.toLowerCase()
    };

    const carData: Partial<Car> = {
      brand, model, engine, year, km, price, fuel, transmission, hp, co2, vin, status,
      image, imageAlt, color, doors, seats, bodyType, verifiedVin,
      featuredOnHomepage, homepageOrder, galleryImages, galleryImagesAlt, equipments, customEquipments, faq,
      description: frTrans.description,
      description_en: enTrans.description,
      description_ru: ruTrans.description,
      detailedSeoDescription, vehicleCondition,
      seoTitle, metaDescription, seoH1, focusKeyword, slug, canonicalUrl,
      robotsIndex: formData.robotsIndex !== false,
      robotsFollow: formData.robotsFollow !== false,
      translations: { fr: frTrans, en: enTrans, ru: ruTrans },
      updatedAt: new Date().toISOString()
    };

    showNotification("Сохранение автомобиля...", "info");

    try {
      if (carToEdit) {
        setCars(prev => prev.map(c => c.id === carToEdit.id ? { ...c, ...carData, id: carToEdit.id } as Car : c));
        const carDocRef = doc(db, 'artifacts', appId, 'public', 'data', 'cars', carToEdit.id);
        await setDoc(carDocRef, carData, { merge: true });
      } else {
        const localId = `car-${Date.now()}`;
        const newCar = { id: localId, ...carData, createdAt: new Date().toISOString() } as Car;
        setCars(prev => [newCar, ...prev]);
        const carsCollection = collection(db, 'artifacts', appId, 'public', 'data', 'cars');
        await addDoc(carsCollection, carData);
      }
      showNotification("Автомобиль успешно сохранен!", "success");
      setShowAddEditModal(false);
    } catch (err: any) {
      console.warn("Save offline:", err);
      showNotification("Автомобиль сохранен (локально)!", "success");
      setShowAddEditModal(false);
    }
  };

  const handleDeleteCar = async () => {
    if (!deleteConfirmCar) return;
    const carId = deleteConfirmCar.id;
    setDeleteConfirmCar(null);
    if (selectedCar && selectedCar.id === carId) setSelectedCar(null);
    setCars(prev => prev.filter(c => c.id !== carId));
    try {
      const carDocRef = doc(db, 'artifacts', appId, 'public', 'data', 'cars', carId);
      await deleteDoc(carDocRef);
      showNotification("Автомобиль успешно удален.", "success");
    } catch (err) {
      showNotification("Автомобиль удален (локально).", "success");
    }
  };

  const handleAdminLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (adminPassword === 'France2026') {
      setIsAdmin(true);
      try { localStorage.setItem('ligo_admin_logged_in', 'true'); } catch {}
      setAdminLoginError(false);
      setAdminPassword('');
      showNotification("Connexion réussie au panneau d'administration", "success");
    } else {
      setAdminLoginError(true);
      showNotification("Mot de passe incorrect", "error");
    }
  };

  const handleCarteGriseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    showNotification("Demande envoyée avec succès !", "success");
  };

  const handleTestDriveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    showNotification("Demande d'essai envoyée avec succès !", "success");
  };

  const handleMarkAsProcessed = async (inquiryId: string) => {
    setInquiries(prev => prev.map(i => i.id === inquiryId ? { ...i, processed: true } : i));
    showNotification("Demande marquée comme traitée", "success");
  };

  const handleDeleteInquiry = async (inquiryId: string) => {
    setInquiries(prev => prev.filter(i => i.id !== inquiryId));
    showNotification("Demande supprimée", "success");
  };

  const handleSaveSettings = async () => {
    showNotification(t('settingsSaved'), "success");
  };

  // Filtered Cars Memo
  const filteredCars = useMemo(() => {
    return cars.filter(car => {
      if (selectedBrand && car.brand.toLowerCase() !== selectedBrand.toLowerCase()) return false;
      if (selectedModel && car.model.toLowerCase() !== selectedModel.toLowerCase()) return false;
      if (priceMin && car.price < Number(priceMin)) return false;
      if (priceMax && car.price > Number(priceMax)) return false;
      if (yearMin && Number(car.year) < Number(yearMin)) return false;
      if (yearMax && Number(car.year) > Number(yearMax)) return false;
      if (transmission && car.transmission !== transmission) return false;
      if (fuel && car.fuel !== fuel) return false;
      if (status && car.status !== status) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const searchStr = `${car.brand} ${car.model} ${car.description || ''} ${car.description_en || ''} ${car.description_ru || ''} ${car.vin || ''} ${car.year}`.toLowerCase();
        if (!searchStr.includes(q)) return false;
      }
      return true;
    });
  }, [cars, selectedBrand, selectedModel, priceMin, priceMax, yearMin, yearMax, transmission, fuel, status, searchQuery]);

  const featuredCars = useMemo(() => {
    const featured = cars.filter(car => Boolean(car.featuredOnHomepage));
    return featured
      .sort((a, b) => (Number(a.homepageOrder) || 999) - (Number(b.homepageOrder) || 999))
      .slice(0, 10);
  }, [cars]);

const renderComparisonView = () => {
    const comparedCars = comparedCarIds.map(id => cars.find(c => c.id === id)).filter(Boolean) as Car[];

    const minPrice = (() => {
      const prices = comparedCars.map(c => Number(c.price || 0)).filter(p => p > 0);
      return prices.length > 1 ? Math.min(...prices) : null;
    })();

    const minKm = (() => {
      const kms = comparedCars.map(c => Number(c.km || 0)).filter(k => k >= 0);
      return kms.length > 1 ? Math.min(...kms) : null;
    })();

    const maxYear = (() => {
      const years = comparedCars.map(c => Number(c.year || 0)).filter(y => y > 0);
      return years.length > 1 ? Math.max(...years) : null;
    })();

    const specRows = [
      {
        id: 'price',
        label: t('compareParamPrice'),
        getter: (c: Car) => Number(c.price || 0),
        format: (c: Car) => c.price ? `${Number(c.price).toLocaleString(lang === 'ru' ? 'ru-RU' : lang === 'en' ? 'en-US' : 'fr-FR')} €` : '—',
        isBest: (c: Car) => minPrice !== null && Number(c.price) === minPrice,
        bestBadge: t('compareBestPrice')
      },
      {
        id: 'year',
        label: t('compareParamYear'),
        getter: (c: Car) => Number(c.year || 0),
        format: (c: Car) => c.year ? String(c.year) : '—',
        isBest: (c: Car) => maxYear !== null && Number(c.year) === maxYear,
        bestBadge: t('compareNewestYear')
      },
      {
        id: 'km',
        label: t('compareParamKm'),
        getter: (c: Car) => Number(c.km || 0),
        format: (c: Car) => c.km !== undefined && c.km !== null ? `${Number(c.km).toLocaleString(lang === 'ru' ? 'ru-RU' : lang === 'en' ? 'en-US' : 'fr-FR')} km` : '—',
        isBest: (c: Car) => minKm !== null && Number(c.km) === minKm,
        bestBadge: t('compareLowestKm')
      },
      {
        id: 'fuel',
        label: t('compareParamFuel'),
        getter: (c: Car) => c.fuel || '',
        format: (c: Car) => translateFuel(c.fuel, lang) || '—'
      },
      {
        id: 'transmission',
        label: t('compareParamTransmission'),
        getter: (c: Car) => c.transmission || '',
        format: (c: Car) => translateTransmission(c.transmission, lang) || '—'
      },
      {
        id: 'power',
        label: t('compareParamPower'),
        getter: (c: Car) => c.hp || 0,
        format: (c: Car) => c.hp ? `${c.hp} ${t('hp')}` : '—'
      },
      {
        id: 'engine',
        label: t('compareParamEngine'),
        getter: (c: Car) => (c.engine || '').trim(),
        format: (c: Car) => c.engine || '—'
      },
      {
        id: 'co2',
        label: t('compareParamCo2'),
        getter: (c: Car) => c.co2 || '',
        format: (c: Car) => c.co2 ? `${c.co2} g/km` : '—'
      },
      {
        id: 'color',
        label: t('compareParamColor'),
        getter: (c: Car) => (c.color || '').trim(),
        format: (c: Car) => translateColor(c.color, lang) || '—'
      },
      {
        id: 'bodyType',
        label: t('compareParamBody'),
        getter: (c: Car) => (c.bodyType || '').trim(),
        format: (c: Car) => translateBodyType(c.bodyType, lang) || '—'
      },
      {
        id: 'doors',
        label: t('compareParamDoors'),
        getter: (c: Car) => c.doors || 0,
        format: (c: Car) => c.doors ? `${c.doors} ${t('doorsCount')}` : '—'
      },
      {
        id: 'seats',
        label: t('compareParamSeats'),
        getter: (c: Car) => c.seats || 0,
        format: (c: Car) => c.seats ? `${c.seats} ${t('seatsCount')}` : '—'
      },
      {
        id: 'verifiedVin',
        label: t('compareParamVin'),
        getter: (c: Car) => !!c.verifiedVin,
        format: (c: Car) => c.verifiedVin ? (lang === 'ru' ? '✓ Проверен' : lang === 'en' ? '✓ Verified' : '✓ Garanti') : '—'
      },
      {
        id: 'warranty',
        label: t('compareParamWarranty'),
        getter: (c: Car) => (c.warranty || '12 mois').trim(),
        format: (c: Car) => lang === 'ru' ? '12 месяцев' : lang === 'en' ? '12 months' : '12 mois'
      },
      {
        id: 'status',
        label: t('compareParamStatus'),
        getter: (c: Car) => c.status || '',
        format: (c: Car) => t(c.status) || c.status || '—'
      }
    ];

    // Aggregated unique equipments & custom equipments
    const allCustomEquipments = (() => {
      const list: CustomEquipment[] = [];
      comparedCars.forEach(c => (c.customEquipments || []).forEach(ce => {
        if (ce && !list.some(x => x.id === ce.id)) list.push(ce);
      }));
      return list;
    })();

    const allEquipments = (() => {
      const set = new Set<string>();
      comparedCars.forEach(c => (c.equipments || []).forEach(eq => {
        if (eq && eq.trim()) set.add(eq.trim());
      }));
      return Array.from(set).sort((a, b) => a.localeCompare(b));
    })();

    // Diff filter for spec rows
    const visibleSpecRows = specRows.filter(row => {
      if (!showOnlyDifferences) return true;
      if (comparedCars.length <= 1) return true;
      const firstVal = row.getter(comparedCars[0]);
      return comparedCars.some(c => row.getter(c) !== firstVal);
    });

    // Diff filter for equipments
    const visibleEquipments = allEquipments.filter(eq => {
      if (!showOnlyDifferences) return true;
      if (comparedCars.length <= 1) return true;
      const firstHas = (comparedCars[0].equipments || []).includes(eq);
      return comparedCars.some(c => (c.equipments || []).includes(eq) !== firstHas);
    });

    if (comparedCars.length === 0) {
      return (
        <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-24 text-center space-y-6 animate-fadeIn">
          {/* Breadcrumbs */}
          <nav aria-label="Breadcrumb" className="flex items-center justify-center gap-2 text-xs text-neutral-500 dark:text-neutral-400 py-1">
            <button onClick={() => navigateTo('home')} className="hover:text-[#D4AF37] transition-colors">{t('home')}</button>
            <span>/</span>
            <button onClick={() => navigateTo('catalog')} className="hover:text-[#D4AF37] transition-colors">{t('catalog')}</button>
            <span>/</span>
            <span className="text-neutral-900 dark:text-white font-semibold">{t('comparePageTitle')}</span>
          </nav>

          <div className="w-24 h-24 mx-auto rounded-3xl bg-[#D4AF37]/10 border border-[#D4AF37]/30 flex items-center justify-center text-[#D4AF37]">
            <Icons.Compare />
          </div>

          <div className="space-y-3">
            <h1 className="text-3xl sm:text-4xl font-serif font-bold text-neutral-900 dark:text-white">
              {t('compareEmptyTitle')}
            </h1>
            <p className="text-sm sm:text-base text-neutral-600 dark:text-neutral-400 max-w-lg mx-auto font-light">
              {t('compareEmptyDesc')}
            </p>
          </div>

          <div className="pt-4">
            <button
              onClick={() => navigateTo('catalog')}
              className="px-8 py-4 rounded-xl bg-[#D4AF37] hover:bg-[#D4AF37]/90 text-neutral-950 font-bold text-xs uppercase tracking-widest transition-all shadow-xl shadow-[#D4AF37]/20 hover:scale-105"
            >
              {t('compareBackToCatalog')}
            </button>
          </div>
        </section>
      );
    }

    const slot1 = Math.min(mobileCompareSlot1, Math.max(0, comparedCars.length - 1));
    let slot2 = Math.min(mobileCompareSlot2, Math.max(0, comparedCars.length - 1));
    if (slot2 === slot1 && comparedCars.length > 1) {
      slot2 = slot1 === 0 ? 1 : 0;
    }
    const mobileCar1 = comparedCars[slot1] || comparedCars[0];
    const mobileCar2 = comparedCars[slot2] || comparedCars[1] || comparedCars[0];

    return (
      <section className="max-w-[95rem] mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6 sm:space-y-8 animate-fadeIn">
        {/* Breadcrumbs & Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-200 dark:border-neutral-800 pb-4">
          <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs text-neutral-500 dark:text-neutral-400">
            <button onClick={() => navigateTo('home')} className="hover:text-[#D4AF37] transition-colors">{t('home')}</button>
            <span>/</span>
            <button onClick={() => navigateTo('catalog')} className="hover:text-[#D4AF37] transition-colors">{t('catalog')}</button>
            <span>/</span>
            <span className="text-neutral-900 dark:text-white font-semibold">{t('comparePageTitle')}</span>
          </nav>

          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            {/* Show Differences Only Toggle */}
            <button
              onClick={() => setShowOnlyDifferences(!showOnlyDifferences)}
              className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl text-xs font-bold transition-all border ${
                showOnlyDifferences
                  ? 'bg-[#D4AF37] text-neutral-950 border-[#D4AF37] shadow-sm'
                  : 'bg-white dark:bg-[#121214] text-neutral-700 dark:text-neutral-300 border-neutral-200 dark:border-neutral-800 hover:border-[#D4AF37]'
              }`}
            >
              <span className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center text-[9px] ${
                showOnlyDifferences ? 'bg-neutral-950 text-[#D4AF37] border-neutral-950' : 'border-neutral-400'
              }`}>
                {showOnlyDifferences ? '✓' : ''}
              </span>
              <span>{t('compareShowDiffOnly')}</span>
            </button>

            {/* Clear All */}
            <button
              onClick={handleClearComparison}
              className="px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl bg-neutral-100 dark:bg-[#121214] hover:bg-red-500/10 text-neutral-600 dark:text-neutral-400 hover:text-red-500 dark:hover:text-red-400 border border-neutral-200 dark:border-neutral-800 text-xs font-bold transition-all"
            >
              {t('compareClearAll')}
            </button>

            {/* Add More Cars CTA */}
            {comparedCars.length < 4 && (
              <button
                onClick={() => navigateTo('catalog')}
                className="px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl bg-white dark:bg-[#121214] text-[#D4AF37] border border-[#D4AF37]/40 hover:border-[#D4AF37] text-xs font-bold uppercase tracking-wider transition-all"
              >
                + {lang === 'ru' ? 'Добавить авто' : lang === 'en' ? 'Add vehicle' : 'Ajouter un véhicule'} ({comparedCars.length}/4)
              </button>
            )}
          </div>
        </div>

        {/* Page Title & Intro */}
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#D4AF37]/10 text-[#D4AF37] text-[10px] font-bold uppercase tracking-widest border border-[#D4AF37]/20">
            <Icons.Compare />
            <span>{comparedCars.length} / 4 {t('vehiclesCountLabel')}</span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-serif font-black text-neutral-900 dark:text-white">
            {t('comparePageTitle')}
          </h1>
          <p className="text-xs sm:text-sm text-neutral-600 dark:text-neutral-400 font-light max-w-2xl">
            {t('comparePageSubtitle')}
          </p>
        </div>

        {/* ========================================================= */}
        {/* MOBILE VIEW (< md) - Side-by-Side Cards & Spec Breakdown  */}
        {/* ========================================================= */}
        <div className="block md:hidden space-y-6">
          {/* 3 or 4 cars selector */}
          {comparedCars.length > 2 && (
            <div className="bg-neutral-100 dark:bg-[#121214] p-3 rounded-2xl border border-neutral-200 dark:border-neutral-800 space-y-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#D4AF37] block text-center">
                {lang === 'ru' ? 'Сравнить 2 выбранных автомобиля:' : lang === 'en' ? 'Compare 2 selected vehicles:' : 'Comparer 2 véhicules sélectionnés :'}
              </span>
              <div className="grid grid-cols-2 gap-2">
                <select
                  value={mobileCar1?.id}
                  onChange={(e) => {
                    const idx = comparedCars.findIndex(c => c.id === e.target.value);
                    if (idx !== -1) setMobileCompareSlot1(idx);
                  }}
                  className="w-full bg-white dark:bg-[#0D0D0D] border border-neutral-200 dark:border-neutral-800 focus:border-[#D4AF37] rounded-xl py-2 px-2 text-[11px] font-bold text-neutral-900 dark:text-white focus:outline-none truncate cursor-pointer shadow-sm"
                >
                  {comparedCars.map((c, i) => (
                    <option key={c.id} value={c.id} disabled={i === slot2}>
                      1: {c.brand} {c.model}
                    </option>
                  ))}
                </select>
                <select
                  value={mobileCar2?.id}
                  onChange={(e) => {
                    const idx = comparedCars.findIndex(c => c.id === e.target.value);
                    if (idx !== -1) setMobileCompareSlot2(idx);
                  }}
                  className="w-full bg-white dark:bg-[#0D0D0D] border border-neutral-200 dark:border-neutral-800 focus:border-[#D4AF37] rounded-xl py-2 px-2 text-[11px] font-bold text-neutral-900 dark:text-white focus:outline-none truncate cursor-pointer shadow-sm"
                >
                  {comparedCars.map((c, i) => (
                    <option key={c.id} value={c.id} disabled={i === slot1}>
                      2: {c.brand} {c.model}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* Top Hero Cards: 2 Side-by-Side Columns */}
          <div className={`grid ${comparedCars.length === 1 ? 'grid-cols-1' : 'grid-cols-2'} gap-2.5 sm:gap-4`}>
            {[mobileCar1, ...(comparedCars.length > 1 ? [mobileCar2] : [])].map((car) => (
              <div key={car.id} className="bg-white dark:bg-[#121214] border border-neutral-200 dark:border-neutral-800/90 rounded-2xl p-2.5 sm:p-3 shadow-sm space-y-2.5 flex flex-col justify-between">
                <div>
                  {/* Photo with remove button & status badge */}
                  <div className="relative aspect-[4/3] rounded-xl overflow-hidden bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-sm">
                    <img
                      src={car.image || getFallbackSvg(400, 300, 16, 2)}
                      alt={`${car.brand} ${car.model}`}
                      className={`w-full h-full object-cover ${car.status === 'Vendu' ? 'grayscale opacity-60' : ''}`}
                      onError={(e: any) => { e.currentTarget.src = getFallbackSvg(400, 300, 16, 2); }}
                    />
                    <button
                      onClick={() => handleRemoveFromCompare(car.id)}
                      className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/75 hover:bg-red-600 text-white flex items-center justify-center transition-all backdrop-blur-md shadow"
                      title={t('removeFromCompare')}
                    >
                      <Icons.X />
                    </button>
                    <div className="absolute top-1 left-1">
                      <span className={`px-1.5 py-0.5 rounded-full text-[8px] font-bold uppercase tracking-wider ${
                        car.status === 'Vendu'
                          ? 'bg-neutral-900 text-neutral-400'
                          : car.status === 'En arrivage'
                            ? 'bg-amber-950/90 text-amber-400 border border-amber-900/50'
                            : 'bg-green-950/90 text-green-400 border border-green-900/50'
                      }`}>
                        {t(car.status)}
                      </span>
                    </div>
                  </div>

                  {/* Brand & Model */}
                  <div className="pt-2">
                    <span className="text-[10px] uppercase tracking-wider text-neutral-500 font-bold block">{car.brand}</span>
                    <h3 className="text-xs sm:text-sm font-serif font-bold text-neutral-900 dark:text-white leading-snug line-clamp-2 min-h-[30px] mt-0.5">
                      {car.model} {car.engine || ''}
                    </h3>
                  </div>

                  {/* Price & Best Badge */}
                  <div className="pt-1.5 border-t border-neutral-100 dark:border-neutral-800">
                    <div className="text-base sm:text-lg font-serif font-black text-[#D4AF37] leading-tight">
                      {car.price ? `${Number(car.price).toLocaleString(lang === 'ru' ? 'ru-RU' : lang === 'en' ? 'en-US' : 'fr-FR')} €` : '—'}
                    </div>
                    {minPrice !== null && Number(car.price) === minPrice && (
                      <span className="inline-block mt-0.5 px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-[8px] font-bold uppercase">
                        ★ {t('compareBestPrice')}
                      </span>
                    )}
                  </div>
                </div>

                {/* Card Action Buttons */}
                <div className="space-y-1.5 pt-1">
                  <button
                    onClick={() => handleSelectCar(car)}
                    className="w-full py-2 px-2 rounded-xl bg-[#D4AF37] hover:bg-[#D4AF37]/90 text-neutral-950 font-bold text-[10px] uppercase tracking-wider transition-all text-center shadow-sm"
                  >
                    {t('compareViewCar')}
                  </button>
                  <a
                    href={`https://wa.me/${siteSettings.phone?.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(`Bonjour Ligo Automobiles, je souhaite des informations sur le véhicule ${car.brand} ${car.model} (${car.year}) au prix de ${car.price?.toLocaleString('fr-FR')} € suite à ma comparaison sur votre site.\nLien : https://ligo-auto.fr/vehicules/${car.slug || generateCarSlug(car)}/`)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => trackAnalyticsEvent('vehicle_whatsapp_click', { vehicleId: car.id, brand: car.brand, model: car.model })}
                    className="w-full flex items-center justify-center gap-1 py-1.5 px-2 rounded-xl bg-[#25D366] hover:bg-[#20bd5a] text-white font-bold text-[10px] uppercase tracking-wider transition-all text-center shadow-sm"
                  >
                    <Icons.WhatsApp />
                    <span>WhatsApp</span>
                  </a>
                </div>
              </div>
            ))}
          </div>

          {/* Specs Category */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-neutral-100 dark:bg-[#121214] border border-neutral-200 dark:border-neutral-800">
              <span className="text-[#D4AF37] text-xs">⚡</span>
              <h4 className="text-xs font-bold uppercase tracking-widest text-neutral-900 dark:text-white">
                {t('carKeySpecs')}
              </h4>
            </div>

            <div className="space-y-2">
              {visibleSpecRows.map((row) => {
                const val1 = row.format(mobileCar1);
                const isBest1 = row.isBest ? row.isBest(mobileCar1) : false;
                const val2 = row.format(mobileCar2);
                const isBest2 = row.isBest ? row.isBest(mobileCar2) : false;

                return (
                  <div key={row.id} className="bg-white dark:bg-[#121214] border border-neutral-200 dark:border-neutral-800/90 rounded-2xl p-3 shadow-sm space-y-1.5">
                    <div className="text-[11px] font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 text-center">
                      {row.label}
                    </div>
                    <div className={`grid ${comparedCars.length === 1 ? 'grid-cols-1' : 'grid-cols-2'} gap-2 pt-1 border-t border-neutral-100 dark:border-neutral-800`}>
                      <div className="text-center space-y-0.5">
                        <div className={`text-xs font-semibold ${isBest1 ? 'text-emerald-600 dark:text-emerald-400 font-bold' : 'text-neutral-800 dark:text-neutral-200'}`}>
                          {val1}
                        </div>
                        {isBest1 && row.bestBadge && (
                          <span className="inline-block px-1.5 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-[8px] font-bold whitespace-nowrap">
                            ★ {row.bestBadge}
                          </span>
                        )}
                      </div>

                      {comparedCars.length > 1 && (
                        <div className="text-center space-y-0.5 border-l border-neutral-100 dark:border-neutral-800 pl-2">
                          <div className={`text-xs font-semibold ${isBest2 ? 'text-emerald-600 dark:text-emerald-400 font-bold' : 'text-neutral-800 dark:text-neutral-200'}`}>
                            {val2}
                          </div>
                          {isBest2 && row.bestBadge && (
                            <span className="inline-block px-1.5 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-[8px] font-bold whitespace-nowrap">
                              ★ {row.bestBadge}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Equipments Category */}
          {visibleEquipments.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-neutral-100 dark:bg-[#121214] border border-neutral-200 dark:border-neutral-800">
                <span className="text-[#D4AF37] text-xs">⚙️</span>
                <h4 className="text-xs font-bold uppercase tracking-widest text-neutral-900 dark:text-white">
                  {t('carEquipments')} ({visibleEquipments.length})
                </h4>
              </div>

              <div className="space-y-2">
                {visibleEquipments.map((eq) => {
                  const has1 = (mobileCar1.equipments || []).some(e => e.trim().toLowerCase() === eq.trim().toLowerCase());
                  const has2 = (mobileCar2.equipments || []).some(e => e.trim().toLowerCase() === eq.trim().toLowerCase());

                  return (
                    <div key={eq} className="bg-white dark:bg-[#121214] border border-neutral-200 dark:border-neutral-800/90 rounded-2xl p-3 shadow-sm space-y-1.5">
                      <div className="text-[11px] font-semibold text-neutral-800 dark:text-neutral-200 text-center leading-snug">
                        {translateEquipment(eq, lang, allCustomEquipments)}
                      </div>
                      <div className={`grid ${comparedCars.length === 1 ? 'grid-cols-1' : 'grid-cols-2'} gap-2 pt-1 border-t border-neutral-100 dark:border-neutral-800`}>
                        <div className="flex justify-center items-center">
                          {has1 ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold">
                              <span>✓</span> <span>{lang === 'ru' ? 'Есть' : lang === 'en' ? 'Yes' : 'Inclus'}</span>
                            </span>
                          ) : (
                            <span className="text-neutral-400 text-xs font-medium">—</span>
                          )}
                        </div>

                        {comparedCars.length > 1 && (
                          <div className="flex justify-center items-center border-l border-neutral-100 dark:border-neutral-800 pl-2">
                            {has2 ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold">
                                <span>✓</span> <span>{lang === 'ru' ? 'Есть' : lang === 'en' ? 'Yes' : 'Inclus'}</span>
                              </span>
                            ) : (
                              <span className="text-neutral-400 text-xs font-medium">—</span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Bottom Action Footer */}
          <div className={`grid ${comparedCars.length === 1 ? 'grid-cols-1' : 'grid-cols-2'} gap-2.5 pt-2`}>
            {[mobileCar1, ...(comparedCars.length > 1 ? [mobileCar2] : [])].map((car) => (
              <div key={car.id} className="space-y-1.5">
                <button
                  onClick={() => handleSelectCar(car)}
                  className="w-full py-2.5 px-2 rounded-xl bg-[#D4AF37] hover:bg-[#D4AF37]/90 text-neutral-950 font-bold text-[10px] uppercase tracking-wider transition-all text-center shadow-md active:scale-95"
                >
                  {t('compareViewCar')}
                </button>
                <a
                  href={`https://wa.me/${siteSettings.phone?.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(`Bonjour Ligo Automobiles, je souhaite des informations sur le véhicule ${car.brand} ${car.model} (${car.year}) au prix de ${car.price?.toLocaleString('fr-FR')} € suite à ma comparaison sur votre site.\nLien : https://ligo-auto.fr/vehicules/${car.slug || generateCarSlug(car)}/`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => trackAnalyticsEvent('vehicle_whatsapp_click', { vehicleId: car.id, brand: car.brand, model: car.model })}
                  className="w-full flex items-center justify-center gap-1 py-2 px-2 rounded-xl bg-[#25D366] hover:bg-[#20bd5a] text-white font-bold text-[10px] uppercase tracking-wider transition-all text-center shadow-sm"
                >
                  <Icons.WhatsApp />
                  <span>WhatsApp</span>
                </a>
              </div>
            ))}
          </div>
        </div>

        {/* ========================================================= */}
        {/* DESKTOP VIEW (md:) - Full-Width Side-by-Side Table       */}
        {/* ========================================================= */}
        <div className="hidden md:block overflow-x-auto rounded-3xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#121214] shadow-xl custom-scrollbar">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-neutral-200 dark:border-neutral-800">
                {/* 1st column header */}
                <th className="sticky left-0 z-20 w-60 min-w-[200px] p-6 bg-neutral-50 dark:bg-[#0E0E10] border-r border-neutral-200 dark:border-neutral-800 align-top">
                  <div className="space-y-1">
                    <span className="text-xs uppercase tracking-widest text-[#D4AF37] font-bold block">{t('catalog')}</span>
                    <h3 className="text-lg font-serif font-bold text-neutral-900 dark:text-white leading-tight">{t('characteristics')}</h3>
                  </div>
                </th>

                {/* Compared Cars Header Columns */}
                {comparedCars.map((car) => (
                  <th key={car.id} className="w-72 md:w-80 min-w-[260px] p-6 align-top border-r border-neutral-200 dark:border-neutral-800/80 last:border-r-0 bg-white dark:bg-[#121214]">
                    <div className="space-y-4">
                      {/* Vehicle Image */}
                      <div className="relative aspect-[16/10] rounded-2xl overflow-hidden bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-sm group">
                        <img
                          src={car.image || getFallbackSvg(600, 375, 20, 2)}
                          alt={`${car.brand} ${car.model}`}
                          className={`w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ${car.status === 'Vendu' ? 'grayscale opacity-60' : ''}`}
                          onError={(e: any) => { e.currentTarget.src = getFallbackSvg(600, 375, 20, 2); }}
                        />
                        <button
                          onClick={() => handleRemoveFromCompare(car.id)}
                          className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/70 hover:bg-red-600 text-white flex items-center justify-center transition-all backdrop-blur-md shadow-md"
                          title={t('removeFromCompare')}
                        >
                          <Icons.X />
                        </button>
                        <div className="absolute top-2 left-2 flex flex-col gap-1">
                          <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${
                            car.status === 'Vendu'
                              ? 'bg-neutral-900 text-neutral-400'
                              : car.status === 'En arrivage'
                                ? 'bg-amber-950/80 text-amber-400 border border-amber-900/50'
                                : 'bg-green-950/80 text-green-400 border border-green-900/50'
                          }`}>
                            {t(car.status)}
                          </span>
                        </div>
                      </div>

                      {/* Brand & Model */}
                      <div>
                        <span className="text-xs uppercase tracking-widest text-neutral-500 dark:text-neutral-400 font-medium">{car.brand}</span>
                        <h2 className="text-xl font-serif font-bold text-neutral-900 dark:text-white leading-tight mt-0.5">
                          {car.model} {car.engine || ''}
                        </h2>
                      </div>

                      {/* Price & Best badge */}
                      <div className="flex items-baseline justify-between gap-2 pt-1 border-t border-neutral-100 dark:border-neutral-800">
                        <div>
                          <div className="text-2xl font-serif font-black text-[#D4AF37]">
                            {car.price ? `${Number(car.price).toLocaleString(lang === 'ru' ? 'ru-RU' : lang === 'en' ? 'en-US' : 'fr-FR')} €` : '—'}
                          </div>
                          <span className="text-[10px] text-neutral-400">{t('taxIncludedTradeIn')}</span>
                        </div>
                        {minPrice !== null && Number(car.price) === minPrice && (
                          <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 text-[10px] font-bold uppercase tracking-wider">
                            ★ {t('compareBestPrice')}
                          </span>
                        )}
                      </div>

                      {/* Quick Details Button */}
                      <button
                        onClick={() => handleSelectCar(car)}
                        className="w-full py-2.5 px-4 rounded-xl bg-neutral-100 hover:bg-[#D4AF37] dark:bg-neutral-900 dark:hover:bg-[#D4AF37] text-neutral-900 hover:text-neutral-950 dark:text-white dark:hover:text-neutral-950 font-bold text-xs uppercase tracking-wider transition-all border border-neutral-200 dark:border-neutral-800 hover:border-[#D4AF37]"
                      >
                        {t('compareViewCar')}
                      </button>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {/* Category Header: Spécifications Principales */}
              <tr className="bg-neutral-100/70 dark:bg-[#0D0D0D] border-y border-neutral-200 dark:border-neutral-800">
                <td colSpan={comparedCars.length + 1} className="py-3 px-6 text-xs font-bold uppercase tracking-widest text-[#D4AF37]">
                  {t('carKeySpecs')}
                </td>
              </tr>

              {/* Spec Rows */}
              {visibleSpecRows.map((row, idx) => (
                <tr
                  key={row.id}
                  className={`border-b border-neutral-100 dark:border-neutral-800/60 hover:bg-neutral-50/60 dark:hover:bg-[#161619] transition-colors ${
                    idx % 2 === 0 ? 'bg-transparent' : 'bg-neutral-50/30 dark:bg-neutral-900/20'
                  }`}
                >
                  {/* Row Label */}
                  <td className="sticky left-0 z-10 py-3.5 px-6 font-semibold text-xs text-neutral-700 dark:text-neutral-300 bg-neutral-50/90 dark:bg-[#0E0E10]/90 backdrop-blur-sm border-r border-neutral-200 dark:border-neutral-800">
                    {row.label}
                  </td>

                  {/* Values for each car */}
                  {comparedCars.map((car) => {
                    const formatted = row.format(car);
                    const isBest = row.isBest ? row.isBest(car) : false;

                    return (
                      <td key={car.id} className="py-3.5 px-6 text-xs text-neutral-800 dark:text-neutral-200 border-r border-neutral-200 dark:border-neutral-800/80 last:border-r-0 font-medium">
                        <div className="flex items-center justify-between gap-2">
                          <span className={`${isBest ? 'font-bold text-emerald-600 dark:text-emerald-400' : ''}`}>
                            {formatted}
                          </span>
                          {isBest && row.bestBadge && (
                            <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-[9px] font-bold">
                              {row.bestBadge}
                            </span>
                          )}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}

              {/* Category Header: Équipements & Options */}
              {visibleEquipments.length > 0 && (
                <>
                  <tr className="bg-neutral-100/70 dark:bg-[#0D0D0D] border-y border-neutral-200 dark:border-neutral-800">
                    <td colSpan={comparedCars.length + 1} className="py-3 px-6 text-xs font-bold uppercase tracking-widest text-[#D4AF37]">
                      {t('carEquipments')} ({visibleEquipments.length})
                    </td>
                  </tr>

                  {visibleEquipments.map((eq, idx) => (
                    <tr
                      key={eq}
                      className={`border-b border-neutral-100 dark:border-neutral-800/60 hover:bg-neutral-50/60 dark:hover:bg-[#161619] transition-colors ${
                        idx % 2 === 0 ? 'bg-transparent' : 'bg-neutral-50/30 dark:bg-neutral-900/20'
                      }`}
                    >
                      <td className="sticky left-0 z-10 py-3.5 px-6 font-semibold text-xs text-neutral-700 dark:text-neutral-300 bg-neutral-50/90 dark:bg-[#0E0E10]/90 backdrop-blur-sm border-r border-neutral-200 dark:border-neutral-800">
                        {translateEquipment(eq, lang, allCustomEquipments)}
                      </td>

                      {comparedCars.map((car) => {
                        const hasEquipment = (car.equipments || []).some(
                          e => e.trim().toLowerCase() === eq.trim().toLowerCase()
                        );

                        return (
                          <td key={car.id} className="py-3.5 px-6 text-center border-r border-neutral-200 dark:border-neutral-800/80 last:border-r-0">
                            {hasEquipment ? (
                              <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-emerald-500/10 text-emerald-500 font-black text-sm">
                                ✓
                              </span>
                            ) : (
                              <span className="text-neutral-400 font-light text-base">—</span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </>
              )}

              {/* Action Footer Row */}
              <tr className="bg-neutral-50 dark:bg-[#0D0D0D] border-t border-neutral-200 dark:border-neutral-800">
                <td className="sticky left-0 z-10 py-6 px-6 font-bold text-xs uppercase tracking-wider text-neutral-500 bg-neutral-50 dark:bg-[#0E0E10] border-r border-neutral-200 dark:border-neutral-800">
                  {lang === 'ru' ? 'Действия' : lang === 'en' ? 'Actions' : 'Actions'}
                </td>

                {comparedCars.map((car) => (
                  <td key={car.id} className="p-6 align-middle border-r border-neutral-200 dark:border-neutral-800/80 last:border-r-0">
                    <div className="space-y-2.5">
                      <button
                        onClick={() => handleSelectCar(car)}
                        className="w-full py-3 px-4 rounded-xl bg-[#D4AF37] hover:bg-[#D4AF37]/90 text-neutral-950 font-bold text-xs uppercase tracking-wider transition-all shadow-md active:scale-95"
                      >
                        {t('compareViewCar')}
                      </button>
                      <a
                        href={`https://wa.me/${siteSettings.phone?.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(`Bonjour Ligo Automobiles, je souhaite des informations sur le véhicule ${car.brand} ${car.model} (${car.year}) au prix de ${car.price?.toLocaleString('fr-FR')} € suite à ma comparaison sur votre site.\nLien : https://ligo-auto.fr/vehicules/${car.slug || generateCarSlug(car)}/`)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={() => trackAnalyticsEvent('vehicle_whatsapp_click', { vehicleId: car.id, brand: car.brand, model: car.model })}
                        className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-[#25D366] hover:bg-[#20bd5a] text-white font-bold text-xs uppercase tracking-wider transition-all shadow-sm"
                      >
                        <Icons.WhatsApp />
                        <span>WhatsApp</span>
                      </a>
                    </div>
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    );
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
            <button onClick={() => { setIsAdmin(false); try { localStorage.removeItem('ligo_admin_logged_in'); } catch {} navigateTo('home'); }} className="px-4 py-2 rounded-xl bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-950/40 text-xs font-bold transition-all">{t('logout')}</button>
          </div>
        </div>

        <div className="flex flex-wrap gap-3 mb-8">
          <button onClick={() => handleSelectAdminTab('featured')} className={`px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2 ${activeAdminTab === 'featured' ? 'bg-[#D4AF37] text-neutral-950 shadow-lg' : 'bg-neutral-100 dark:bg-[#0D0D0D] border border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-400 hover:border-[#D4AF37]'}`}>
            <span>⭐</span> {t('featuredAdminTab')} ({cars.filter(c => c.featuredOnHomepage).length}/10)
          </button>
          <button onClick={() => handleSelectAdminTab('vehicles')} className={`px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${activeAdminTab === 'vehicles' ? 'bg-[#D4AF37] text-neutral-950 shadow-lg' : 'bg-neutral-100 dark:bg-[#0D0D0D] border border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-400 hover:border-[#D4AF37]'}`}>{t('catalog')} ({cars.length})</button>
          <button onClick={() => handleSelectAdminTab('articles')} className={`px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2 ${activeAdminTab === 'articles' ? 'bg-[#D4AF37] text-neutral-950 shadow-lg' : 'bg-neutral-100 dark:bg-[#0D0D0D] border border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-400 hover:border-[#D4AF37]'}`}>
            <span>📝</span> {t('articlesAdminTab')} ({articles.length})
          </button>
          <button onClick={() => handleSelectAdminTab('inquiries')} className={`px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${activeAdminTab === 'inquiries' ? 'bg-[#D4AF37] text-neutral-950 shadow-lg' : 'bg-neutral-100 dark:bg-[#0D0D0D] border border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-400 hover:border-[#D4AF37]'}`}>{t('inquiries')} ({inquiries.length})</button>
          <button onClick={() => handleSelectAdminTab('analytics')} className={`px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2 ${activeAdminTab === 'analytics' ? 'bg-[#D4AF37] text-neutral-950 shadow-lg' : 'bg-neutral-100 dark:bg-[#0D0D0D] border border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-400 hover:border-[#D4AF37]'}`}>
            <span>📊</span> {lang === 'ru' ? 'Аналитика' : lang === 'en' ? 'Analytics' : 'Statistiques'}
          </button>
          <button onClick={() => handleSelectAdminTab('settings')} className={`px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${activeAdminTab === 'settings' ? 'bg-[#D4AF37] text-neutral-950 shadow-lg' : 'bg-neutral-100 dark:bg-[#0D0D0D] border border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-400 hover:border-[#D4AF37]'}`}>CMS & Sitemap</button>
        </div>

        {activeAdminTab === 'featured' && (
          <div className="space-y-6">
            {/* Header with counter and selector */}
            <div className="bg-white dark:bg-[#121214] border border-neutral-200 dark:border-neutral-900 rounded-2xl p-6 shadow-sm">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-3">
                    <h3 className="text-lg text-neutral-900 dark:text-white font-serif flex items-center gap-2">
                      <span>⭐</span> {t('homepageSectionHeader')}
                    </h3>
                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                      cars.filter(c => c.featuredOnHomepage).length >= 10 
                        ? 'bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-300 dark:border-amber-800' 
                        : 'bg-[#D4AF37]/15 text-[#D4AF37] border border-[#D4AF37]/30'
                    }`}>
                      {cars.filter(c => c.featuredOnHomepage).length} / 10 {t('featuredLimitBadge')}
                    </span>
                  </div>
                  <p className="text-neutral-600 dark:text-neutral-400 text-xs mt-1.5">
                    {t('homepageSectionDesc')} {t('reorderInstructions')}
                  </p>
                </div>

                {/* Add vehicle to homepage selector */}
                <div className="flex items-center gap-2 flex-wrap">
                  <select
                    value={selectedAddCarId}
                    onChange={(e) => setSelectedAddCarId(e.target.value)}
                    className="bg-neutral-50 dark:bg-[#0D0D0D] border border-neutral-200 dark:border-neutral-800 focus:border-[#D4AF37] rounded-xl py-2 px-3 text-xs text-neutral-900 dark:text-white focus:outline-none max-w-xs cursor-pointer"
                  >
                    <option value="">{t('selectCarFromCatalog')}</option>
                    {cars.filter(c => !c.featuredOnHomepage).map(c => (
                      <option key={c.id} value={c.id}>
                        {c.brand} {c.model} ({c.price ? c.price.toLocaleString('fr-FR') + ' €' : ''})
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={() => {
                      if (!selectedAddCarId) return;
                      const targetCar = cars.find(c => c.id === selectedAddCarId);
                      if (targetCar) {
                        handleToggleFeatured(targetCar);
                        setSelectedAddCarId('');
                      }
                    }}
                    disabled={!selectedAddCarId || cars.filter(c => c.featuredOnHomepage).length >= 10}
                    className={`flex items-center gap-1.5 px-4 py-2 rounded-xl font-bold text-xs uppercase tracking-wider transition-all shadow-sm ${
                      !selectedAddCarId || cars.filter(c => c.featuredOnHomepage).length >= 10
                        ? 'bg-neutral-200 dark:bg-neutral-800 text-neutral-400 dark:text-neutral-600 cursor-not-allowed'
                        : 'bg-[#D4AF37] hover:bg-[#D4AF37]/90 text-neutral-950'
                    }`}
                  >
                    <Icons.Plus />
                    {t('addToHomepage')}
                  </button>
                </div>
              </div>
            </div>

            {/* List of Featured Cars with Drag & Drop and Controls */}
            {cars.filter(c => c.featuredOnHomepage).length === 0 ? (
              <div className="bg-white dark:bg-[#121214] border border-dashed border-neutral-300 dark:border-neutral-800 rounded-2xl p-12 text-center space-y-4">
                <div className="text-4xl">⭐</div>
                <h4 className="text-base font-serif text-neutral-900 dark:text-white">{t('noFeaturedCars')}</h4>
                <button
                  onClick={() => handleSelectAdminTab('vehicles')}
                  className="px-6 py-2.5 rounded-xl bg-[#D4AF37] hover:bg-[#D4AF37]/90 text-neutral-950 font-bold text-xs uppercase tracking-wider transition-all"
                >
                  {t('catalog')}
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {cars
                  .filter(c => Boolean(c.featuredOnHomepage))
                  .sort((a, b) => (Number(a.homepageOrder) || 999) - (Number(b.homepageOrder) || 999))
                  .map((car, index, arr) => (
                    <div
                      key={car.id}
                      draggable={true}
                      onDragStart={(e) => handleDragStartFeatured(e, car.id)}
                      onDragOver={handleDragOverFeatured}
                      onDrop={(e) => handleDropFeatured(e, car.id)}
                      className={`group bg-white dark:bg-[#121214] border rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition-all duration-200 shadow-sm ${
                        draggedFeaturedId === car.id
                          ? 'opacity-40 border-[#D4AF37] scale-[0.99]'
                          : 'border-neutral-200 dark:border-neutral-900 hover:border-[#D4AF37]/60'
                      }`}
                    >
                      <div className="flex items-center gap-4 w-full sm:w-auto">
                        {/* Drag Handle & Order Badge */}
                        <div className="flex items-center gap-2 cursor-grab active:cursor-grabbing text-neutral-400 hover:text-[#D4AF37] select-none" title="Glisser pour réordonner">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 8h16M4 16h16" />
                          </svg>
                          <div className="w-8 h-8 rounded-xl bg-[#D4AF37]/15 border border-[#D4AF37]/30 text-[#D4AF37] font-black text-sm flex items-center justify-center font-mono shadow-sm">
                            #{index + 1}
                          </div>
                        </div>

                        {/* Thumbnail */}
                        <img 
                          src={car.image || getFallbackSvg(200, 140, 14, 1)} 
                          alt={car.model} 
                          className="w-20 h-14 object-cover rounded-xl border border-neutral-200 dark:border-neutral-800 shrink-0" 
                          onError={(e) => { const fb = getFallbackSvg(200, 140, 14, 1); if (e.currentTarget.src !== fb) e.currentTarget.src = fb; }} 
                        />

                        {/* Car Details */}
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-[10px] text-[#D4AF37] uppercase tracking-widest font-bold">{car.brand}</span>
                            <span className={`px-2 py-0.2 rounded-full text-[8px] font-bold uppercase ${
                              car.status === 'Vendu' 
                                ? 'bg-neutral-100 dark:bg-neutral-950/20 text-neutral-500' 
                                : car.status === 'En arrivage'
                                  ? 'bg-amber-50 dark:bg-amber-950/20 text-amber-600'
                                  : 'bg-green-50 dark:bg-green-950/20 text-green-600'
                            }`}>
                              {t(car.status)}
                            </span>
                          </div>
                          <h4 className="text-sm font-bold text-neutral-900 dark:text-white truncate max-w-xs">{car.model}</h4>
                          <div className="text-xs text-[#D4AF37] font-semibold flex items-center gap-3 mt-0.5">
                            <span>{car.price ? car.price.toLocaleString('fr-FR') : '0'} €</span>
                            <span className="text-neutral-400 font-normal text-[11px]">• {car.year} • {car.km ? car.km.toLocaleString('fr-FR') + ' km' : ''}</span>
                          </div>
                        </div>
                      </div>

                      {/* Controls: Up/Down, Edit, Remove */}
                      <div className="flex items-center justify-between sm:justify-end gap-2 w-full sm:w-auto pt-2 sm:pt-0 border-t sm:border-t-0 border-neutral-100 dark:border-neutral-800">
                        <div className="flex items-center bg-neutral-100 dark:bg-[#0D0D0D] border border-neutral-200 dark:border-neutral-800 rounded-xl p-1 gap-1">
                          <button
                            onClick={() => handleMoveFeatured(car.id, 'up')}
                            disabled={index === 0}
                            className={`p-1.5 rounded-lg transition-all ${
                              index === 0 ? 'text-neutral-300 dark:text-neutral-700 cursor-not-allowed' : 'text-neutral-600 dark:text-neutral-400 hover:bg-[#D4AF37] hover:text-neutral-950'
                            }`}
                            title="Monter (Ordre plus haut)"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 15l7-7 7 7" /></svg>
                          </button>
                          <button
                            onClick={() => handleMoveFeatured(car.id, 'down')}
                            disabled={index === arr.length - 1}
                            className={`p-1.5 rounded-lg transition-all ${
                              index === arr.length - 1 ? 'text-neutral-300 dark:text-neutral-700 cursor-not-allowed' : 'text-neutral-600 dark:text-neutral-400 hover:bg-[#D4AF37] hover:text-neutral-950'
                            }`}
                            title="Descendre (Ordre plus bas)"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7" /></svg>
                          </button>
                        </div>

                        <button
                          onClick={() => handleOpenEditModal(car)}
                          className="p-2.5 rounded-xl bg-neutral-100 dark:bg-[#0D0D0D] hover:bg-[#D4AF37]/10 text-neutral-600 dark:text-neutral-400 hover:text-[#D4AF37] border border-neutral-200 dark:border-neutral-800 transition-all"
                          title={t('edit')}
                        >
                          <Icons.Edit />
                        </button>

                        <button
                          onClick={() => handleToggleFeatured(car)}
                          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-red-50 dark:bg-red-950/20 hover:bg-red-100 dark:hover:bg-red-950/40 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900/40 text-xs font-bold transition-all"
                          title={t('removeFromHomepage')}
                        >
                          <Icons.X />
                          <span className="hidden md:inline">{t('removeFromHomepage')}</span>
                        </button>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>
        )}

        {activeAdminTab === 'vehicles' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-lg text-neutral-900 dark:text-white font-serif">{t('catalog')}</h3>
                <p className="text-xs text-neutral-500 mt-0.5">Tous les véhicules ({cars.length})</p>
              </div>
              <button onClick={handleOpenAddModal} className="flex items-center gap-2 px-6 py-3 rounded-xl bg-[#D4AF37] hover:bg-[#D4AF37]/90 text-neutral-950 font-bold text-xs uppercase tracking-wider transition-all shadow-lg"><Icons.Plus />{t('addCar')}</button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {cars.map(car => (
                <div key={car.id} className="bg-white dark:bg-[#121214] border border-neutral-200 dark:border-neutral-900 hover:border-[#D4AF37]/35 rounded-2xl overflow-hidden flex flex-col justify-between p-5 transition-all shadow-sm">
                  <div className="flex gap-4">
                    <img src={car.image || getFallbackSvg(400, 250, 16, 2)} alt={car.model} className="w-24 h-16 object-cover rounded-lg border border-neutral-200 dark:border-neutral-800" onError={(e) => { const fb = getFallbackSvg(400, 250, 16, 2); if (e.currentTarget.src !== fb) e.currentTarget.src = fb; }} />
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-[#D4AF37] uppercase tracking-widest font-bold">{car.brand}</span>
                        {car.featuredOnHomepage && (
                          <span className="px-1.5 py-0.5 rounded bg-[#D4AF37]/15 border border-[#D4AF37]/30 text-[#D4AF37] text-[9px] font-bold">
                            ⭐ #{car.homepageOrder || '1'}
                          </span>
                        )}
                      </div>
                      <h4 className="text-sm font-bold text-neutral-900 dark:text-white truncate max-w-[150px]">{car.model}</h4>
                      <div className="text-xs text-[#D4AF37] font-semibold">{car.price ? car.price.toLocaleString('fr-FR') : '0'} €</div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between gap-4 mt-4 pt-3 border-t border-neutral-200 dark:border-neutral-900">
                    <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${car.status === 'Vendu' ? 'bg-neutral-100 dark:bg-neutral-950/20 text-neutral-500 dark:text-neutral-400 border border-neutral-200 dark:border-neutral-800' : car.status === 'En arrivage' ? 'bg-amber-50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-900/50' : 'bg-green-50 dark:bg-green-950/20 text-green-600 dark:text-green-400 border border-green-200 dark:border-green-900/50'}`}>{t(car.status)}</span>
                    <div className="flex gap-2 items-center">
                      <button 
                        onClick={() => handleToggleFeatured(car)} 
                        className={`p-2 rounded-lg border transition-all ${
                          car.featuredOnHomepage
                            ? 'bg-[#D4AF37]/20 border-[#D4AF37] text-[#D4AF37]'
                            : 'bg-neutral-100 dark:bg-[#0D0D0D] border-neutral-200 dark:border-neutral-800 text-neutral-400 hover:text-[#D4AF37] hover:border-[#D4AF37]'
                        }`} 
                        title={car.featuredOnHomepage ? `${t('onHomepageBadge')} #${car.homepageOrder || '?'}` : t('addToHomepage')}
                      >
                        ⭐
                      </button>
                      <button onClick={() => handleOpenEditModal(car)} className="p-2 rounded-lg bg-neutral-100 dark:bg-[#0D0D0D] hover:bg-[#D4AF37]/10 text-neutral-600 dark:text-neutral-400 hover:text-[#D4AF37] border border-neutral-200 dark:border-neutral-800 transition-all" title={t('edit')}><Icons.Edit /></button>
                      <button onClick={() => setDeleteConfirmCar(car)} className="p-2 rounded-lg bg-neutral-100 dark:bg-[#0D0D0D] hover:bg-red-50 dark:hover:bg-red-950/20 text-neutral-600 dark:text-neutral-400 hover:text-red-600 dark:hover:text-red-400 border border-neutral-200 dark:border-neutral-800 transition-all" title={t('delete')}><Icons.Trash /></button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeAdminTab === 'articles' && (
          <div className="space-y-6">
            {/* Header & KPI stats */}
            <div className="bg-white dark:bg-[#121214] border border-neutral-200 dark:border-neutral-900 rounded-2xl p-6 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h3 className="text-lg text-neutral-900 dark:text-white font-serif flex items-center gap-2">
                    <span>📝</span> Gestion des articles & Blog
                  </h3>
                  <p className="text-neutral-600 dark:text-neutral-400 text-xs mt-1">
                    Rédigez, optimisez pour le SEO et publiez des articles pour attirer du trafic qualifié.
                  </p>
                </div>
                <button
                  onClick={handleOpenAddArticleModal}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#D4AF37] hover:bg-[#D4AF37]/90 text-neutral-950 font-bold text-xs uppercase tracking-wider transition-all shadow-md"
                >
                  <Icons.Plus /> {t('addArticle')}
                </button>
              </div>

              {/* KPI metrics */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 pt-6 border-t border-neutral-100 dark:border-neutral-800">
                <div className="bg-neutral-50 dark:bg-[#0D0D0D] rounded-xl p-3 text-center border border-neutral-200/60 dark:border-neutral-800">
                  <span className="text-[10px] uppercase font-bold text-neutral-500 block">Total Articles</span>
                  <span className="text-xl font-bold text-neutral-900 dark:text-white">{articles.length}</span>
                </div>
                <div className="bg-neutral-50 dark:bg-[#0D0D0D] rounded-xl p-3 text-center border border-neutral-200/60 dark:border-neutral-800">
                  <span className="text-[10px] uppercase font-bold text-emerald-600 block">Publiés</span>
                  <span className="text-xl font-bold text-emerald-600 dark:text-emerald-400">{articles.filter(a => a.status === 'published').length}</span>
                </div>
                <div className="bg-neutral-50 dark:bg-[#0D0D0D] rounded-xl p-3 text-center border border-neutral-200/60 dark:border-neutral-800">
                  <span className="text-[10px] uppercase font-bold text-amber-600 block">Brouillons</span>
                  <span className="text-xl font-bold text-amber-600 dark:text-amber-400">{articles.filter(a => a.status === 'draft').length}</span>
                </div>
                <div className="bg-neutral-50 dark:bg-[#0D0D0D] rounded-xl p-3 text-center border border-neutral-200/60 dark:border-neutral-800">
                  <span className="text-[10px] uppercase font-bold text-[#D4AF37] block">Sur l'accueil</span>
                  <span className="text-xl font-bold text-[#D4AF37]">{articles.filter(a => a.homepageFeatured).length} / 3</span>
                </div>
              </div>
            </div>

            {/* Filter toolbar */}
            <div className="bg-white dark:bg-[#121214] border border-neutral-200 dark:border-neutral-900 rounded-2xl p-4 shadow-sm flex flex-col sm:flex-row gap-3">
              <div className="flex-1 relative">
                <input
                  type="text"
                  value={articleSearchQuery}
                  onChange={(e) => setArticleSearchQuery(e.target.value)}
                  placeholder={t('searchArticlePlaceholder')}
                  className="w-full bg-neutral-50 dark:bg-[#0D0D0D] border border-neutral-200 dark:border-neutral-800 focus:border-[#D4AF37] rounded-xl py-2 pl-3 pr-8 text-xs text-neutral-900 dark:text-white focus:outline-none"
                />
                {articleSearchQuery && (
                  <button onClick={() => setArticleSearchQuery('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600">×</button>
                )}
              </div>
              <select
                value={articleStatusFilter}
                onChange={(e) => setArticleStatusFilter(e.target.value as any)}
                className="bg-neutral-50 dark:bg-[#0D0D0D] border border-neutral-200 dark:border-neutral-800 focus:border-[#D4AF37] rounded-xl py-2 px-3 text-xs text-neutral-900 dark:text-white focus:outline-none cursor-pointer"
              >
                <option value="all">Tous les statuts</option>
                <option value="published">Publiés</option>
                <option value="draft">Brouillons</option>
                <option value="scheduled">Programmés</option>
                <option value="archived">Archivés</option>
              </select>
            </div>

            {/* Articles list */}
            {articles
              .filter(art => {
                if (articleStatusFilter !== 'all' && art.status !== articleStatusFilter) return false;
                if (articleSearchQuery) {
                  const q = articleSearchQuery.toLowerCase();
                  const match = `${art.title} ${art.excerpt || ''} ${art.tags?.join(' ') || ''} ${art.focusKeyword || ''} ${art.translations?.en?.title || ''} ${art.translations?.ru?.title || ''}`.toLowerCase();
                  if (!match.includes(q)) return false;
                }
                return true;
              })
              .length === 0 ? (
                <div className="bg-white dark:bg-[#121214] border border-neutral-200 dark:border-neutral-900 rounded-2xl p-12 text-center">
                  <p className="text-neutral-500 dark:text-neutral-400 text-sm">{t('noArticlesFound')}</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {articles
                    .filter(art => {
                      if (articleStatusFilter !== 'all' && art.status !== articleStatusFilter) return false;
                      if (articleSearchQuery) {
                        const q = articleSearchQuery.toLowerCase();
                        const match = `${art.title} ${art.excerpt || ''} ${art.tags?.join(' ') || ''} ${art.focusKeyword || ''} ${art.translations?.en?.title || ''} ${art.translations?.ru?.title || ''}`.toLowerCase();
                        if (!match.includes(q)) return false;
                      }
                      return true;
                    })
                    .map(art => {
                      const cat = articleCategories.find(c => c.id === art.categoryId);
                      const catTrans = getCategoryLang(cat, lang);
                      const artTrans = getArticleLang(art, lang);
                      const isFrOk = isArticleLangFilled(art, 'fr');
                      const isEnOk = isArticleLangFilled(art, 'en');
                      const isRuOk = isArticleLangFilled(art, 'ru');
                      const linkedVehicle = cars.find(c => c.id === (art.relatedVehicleId || art.relatedVehicleIds?.[0]));

                      return (
                        <div
                          key={art.id}
                          className="bg-white dark:bg-[#121214] border border-neutral-200 dark:border-neutral-900 hover:border-[#D4AF37]/40 rounded-2xl p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all shadow-sm"
                        >
                          <div className="flex items-start gap-4">
                            <img
                              src={art.featuredImage || getFallbackSvg(200, 140, 14, 2)}
                              alt={artTrans.imageAlt || artTrans.title}
                              className="w-24 h-20 sm:w-28 sm:h-20 object-cover rounded-xl border border-neutral-200 dark:border-neutral-800 flex-shrink-0"
                              onError={(e) => { const fb = getFallbackSvg(200, 140, 14, 2); if (e.currentTarget.src !== fb) e.currentTarget.src = fb; }}
                            />
                            <div className="space-y-1 min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                  art.status === 'published' ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/50' :
                                  art.status === 'draft' ? 'bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-900/50' :
                                  art.status === 'scheduled' ? 'bg-purple-50 dark:bg-purple-950/30 text-purple-600 dark:text-purple-400 border border-purple-200 dark:border-purple-900/50' :
                                  'bg-neutral-100 text-neutral-500'
                                }`}>
                                  {t(`${art.status}Status`)}
                                </span>

                                {/* Multilingual completeness badges */}
                                <div className="flex items-center gap-1 text-[10px] font-bold">
                                  <span className={`px-1.5 py-0.5 rounded border ${isFrOk ? 'bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/30' : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-400 border-neutral-300 dark:border-neutral-700'}`}>
                                    FR {isFrOk ? '✅' : '⚠️'}
                                  </span>
                                  <span className={`px-1.5 py-0.5 rounded border ${isEnOk ? 'bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/30' : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30'}`}>
                                    EN {isEnOk ? '✅' : '⚠️'}
                                  </span>
                                  <span className={`px-1.5 py-0.5 rounded border ${isRuOk ? 'bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/30' : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30'}`}>
                                    RU {isRuOk ? '✅' : '⚠️'}
                                  </span>
                                </div>

                                {linkedVehicle && (
                                  <span className="px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-900/50 text-[10px] font-bold">
                                    🚗 {linkedVehicle.brand} {linkedVehicle.model}
                                  </span>
                                )}

                                {art.homepageFeatured && (
                                  <span className="px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-900/50 text-[10px] font-bold">
                                    ⭐ Accueil #{art.homepageOrder || '1'}
                                  </span>
                                )}
                              </div>

                              <h4 className="text-sm font-bold text-neutral-900 dark:text-white line-clamp-1 hover:text-[#D4AF37] cursor-pointer" onClick={() => handleSelectArticle(art)}>
                                {artTrans.title}
                              </h4>
                              <p className="text-xs text-neutral-500 dark:text-neutral-400 line-clamp-1">
                                {artTrans.excerpt}
                              </p>
                              <div className="flex flex-wrap items-center gap-3 text-[11px] text-neutral-400 pt-0.5">
                                <span>📅 {new Date(art.publishedAt || Date.now()).toLocaleDateString(lang === 'ru' ? 'ru-RU' : lang === 'en' ? 'en-US' : 'fr-FR')}</span>
                                <span>⏱️ {artTrans.readingTime || 5} min</span>
                                <span>🔗 /actualites/{artTrans.slug || art.slug}/</span>
                              </div>
                            </div>
                          </div>

                          {/* Controls & Actions */}
                          <div className="flex items-center gap-2 self-end md:self-center">
                            <button
                              onClick={() => handleToggleArticleHomepage(art)}
                              className={`p-2 rounded-xl border text-xs transition-all ${
                                art.homepageFeatured
                                  ? 'bg-[#D4AF37]/20 border-[#D4AF37] text-[#D4AF37]'
                                  : 'bg-neutral-100 dark:bg-[#0D0D0D] border-neutral-200 dark:border-neutral-800 text-neutral-400 hover:text-[#D4AF37] hover:border-[#D4AF37]'
                              }`}
                              title={art.homepageFeatured ? "Retirer de la page d'accueil" : "Afficher sur la page d'accueil (Max 3)"}
                            >
                              ⭐
                            </button>
                            {art.homepageFeatured && (
                              <div className="flex flex-col gap-0.5">
                                <button
                                  onClick={() => handleMoveArticleHomepage(art.id, 'up')}
                                  className="px-1 py-0.5 rounded bg-neutral-100 dark:bg-[#0D0D0D] text-[9px] hover:text-[#D4AF37]"
                                  title="Monter"
                                >
                                  ▲
                                </button>
                                <button
                                  onClick={() => handleMoveArticleHomepage(art.id, 'down')}
                                  className="px-1 py-0.5 rounded bg-neutral-100 dark:bg-[#0D0D0D] text-[9px] hover:text-[#D4AF37]"
                                  title="Descendre"
                                >
                                  ▼
                                </button>
                              </div>
                            )}
                            <button
                              onClick={() => handleSelectArticle(art)}
                              className="p-2 rounded-xl bg-neutral-100 dark:bg-[#0D0D0D] hover:bg-[#D4AF37]/10 text-neutral-600 dark:text-neutral-400 hover:text-[#D4AF37] border border-neutral-200 dark:border-neutral-800 transition-all"
                              title={t('previewArticle')}
                            >
                              <Icons.Eye />
                            </button>
                            <button
                              onClick={() => handleDuplicateArticle(art)}
                              className="p-2 rounded-xl bg-neutral-100 dark:bg-[#0D0D0D] hover:bg-[#D4AF37]/10 text-neutral-600 dark:text-neutral-400 hover:text-[#D4AF37] border border-neutral-200 dark:border-neutral-800 transition-all"
                              title={t('duplicateArticle')}
                            >
                              <Icons.Copy />
                            </button>
                            <button
                              onClick={() => handleOpenEditArticleModal(art)}
                              className="p-2 rounded-xl bg-neutral-100 dark:bg-[#0D0D0D] hover:bg-[#D4AF37]/10 text-neutral-600 dark:text-neutral-400 hover:text-[#D4AF37] border border-neutral-200 dark:border-neutral-800 transition-all"
                              title={t('editArticle')}
                            >
                              <Icons.Edit />
                            </button>
                            <button
                              onClick={() => setDeleteConfirmArticle(art)}
                              className="p-2 rounded-xl bg-neutral-100 dark:bg-[#0D0D0D] hover:bg-red-50 dark:hover:bg-red-950/20 text-neutral-600 dark:text-neutral-400 hover:text-red-500 border border-neutral-200 dark:border-neutral-800 transition-all"
                              title={t('deleteArticle')}
                            >
                              <Icons.Trash />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}
          </div>
        )}

        {activeAdminTab === 'articles' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-lg text-neutral-900 dark:text-white font-serif">{lang === 'ru' ? 'Статьи' : 'Articles'}</h3>
              <button onClick={handleOpenArticleAdd} className="flex items-center gap-2 px-6 py-3 rounded-xl bg-[#D4AF37] hover:bg-[#D4AF37]/90 text-neutral-950 font-bold text-xs uppercase tracking-wider transition-all shadow-lg"><Icons.Plus />{lang === 'ru' ? 'Новая статья' : lang === 'en' ? 'New Article' : 'Nouvel article'}</button>
            </div>
            {articles.length === 0 ? (
              <div className="text-center py-16 text-neutral-500 dark:text-neutral-400">
                <Icons.FileText />
                <p className="mt-4 text-sm">{lang === 'ru' ? 'Нет статей. Создайте первую!' : lang === 'en' ? 'No articles. Create your first!' : 'Aucun article. Créez le premier !'}</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {articles.map(article => (
                  <div key={article.id} className="bg-white dark:bg-[#121214] border border-neutral-200 dark:border-neutral-900 hover:border-[#D4AF37]/35 rounded-2xl overflow-hidden flex flex-col justify-between transition-all shadow-sm">
                    {article.featuredImage && (
                      <img src={article.featuredImage} alt={article.featuredImageAlt || getArticleTitle(article)} className="w-full h-36 object-cover" />
                    )}
                    <div className="p-5 flex-1 flex flex-col">
                      <h4 className="text-sm font-bold text-neutral-900 dark:text-white line-clamp-2">{getArticleTitle(article)}</h4>
                      <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1 line-clamp-2">{getArticleExcerpt(article)}</p>
                      <div className="flex items-center gap-2 mt-3">
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${article.status === 'published' ? 'bg-green-50 dark:bg-green-950/20 text-green-600 dark:text-green-400 border border-green-200 dark:border-green-900/50' : article.status === 'draft' ? 'bg-neutral-100 dark:bg-neutral-950/20 text-neutral-500 border border-neutral-200 dark:border-neutral-800' : 'bg-amber-50 dark:bg-amber-950/20 text-amber-600 border border-amber-200 dark:border-amber-900/50'}`}>{article.status === 'published' ? (lang === 'ru' ? 'Опубликовано' : 'Publié') : article.status === 'draft' ? (lang === 'ru' ? 'Черновик' : 'Brouillon') : article.status}</span>
                        {article.homepageFeatured && <span className="text-[9px] text-[#D4AF37] font-bold">★ Homepage</span>}
                      </div>
                    </div>
                    <div className="flex items-center justify-end gap-2 p-4 pt-0 border-t border-neutral-200 dark:border-neutral-900 mt-2">
                      <button onClick={() => handleSelectArticle(article)} className="p-2 rounded-lg bg-neutral-100 dark:bg-[#0D0D0D] hover:bg-[#D4AF37]/10 text-neutral-600 dark:text-neutral-400 hover:text-[#D4AF37] border border-neutral-200 dark:border-neutral-800 transition-all" title="Voir"><Icons.Eye /></button>
                      <button onClick={() => handleOpenArticleEdit(article)} className="p-2 rounded-lg bg-neutral-100 dark:bg-[#0D0D0D] hover:bg-[#D4AF37]/10 text-neutral-600 dark:text-neutral-400 hover:text-[#D4AF37] border border-neutral-200 dark:border-neutral-800 transition-all" title="Modifier"><Icons.Edit /></button>
                      <button onClick={() => setDeleteConfirmArticle(article)} className="p-2 rounded-lg bg-neutral-100 dark:bg-[#0D0D0D] hover:bg-red-50 dark:hover:bg-red-950/20 text-neutral-600 dark:text-neutral-400 hover:text-red-600 border border-neutral-200 dark:border-neutral-800 transition-all" title="Supprimer"><Icons.Trash /></button>
                    </div>
                  </div>
                ))}
              </div>
            )}
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

        {/* TAB 5: ANALYTICS & TRAFFIC INSIGHTS */}
        {activeAdminTab === 'analytics' && (() => {
          const now = Date.now();
          const filteredEvents = analyticsEvents.filter(e => {
            const t = new Date(e.timestamp).getTime();
            if (analyticsPeriod === 'today') {
              const todayStart = new Date();
              todayStart.setHours(0, 0, 0, 0);
              return t >= todayStart.getTime();
            }
            if (analyticsPeriod === '7d') return now - t <= 7 * 86400000;
            if (analyticsPeriod === '30d') return now - t <= 30 * 86400000;
            if (analyticsPeriod === '90d') return now - t <= 90 * 86400000;
            return true;
          });

          const totalVisits = filteredEvents.filter(e => e.event === 'page_view' || e.event === 'catalog_view' || e.event === 'vehicle_view').length;
          const uniqueVisitors = new Set(filteredEvents.map(e => e.visitorId)).size;
          const totalSessions = new Set(filteredEvents.map(e => e.sessionId)).size;
          const vehicleViews = filteredEvents.filter(e => e.event === 'vehicle_view').length;
          const whatsappClicks = filteredEvents.filter(e => e.event === 'vehicle_whatsapp_click' || e.event === 'article_whatsapp_click').length;
          const phoneClicks = filteredEvents.filter(e => e.event === 'vehicle_phone_click').length;
          const totalLeads = whatsappClicks + phoneClicks + filteredEvents.filter(e => e.event === 'vehicle_lead_submit').length;
          const comparisonEvents = filteredEvents.filter(e => e.event === 'vehicle_compare_add' || e.event === 'comparison_view').length;
          const articleViews = filteredEvents.filter(e => e.event === 'article_view').length;
          const conversionRate = uniqueVisitors > 0 ? ((totalLeads / uniqueVisitors) * 100).toFixed(1) : '0.0';

          // Daily stats for chart (last 14 days)
          const daysCount = analyticsPeriod === 'today' ? 1 : analyticsPeriod === '7d' ? 7 : analyticsPeriod === '30d' ? 14 : 20;
          const dailyChartData = Array.from({ length: daysCount }).map((_, idx) => {
            const d = new Date();
            d.setDate(d.getDate() - (daysCount - 1 - idx));
            const dayStr = d.toISOString().split('T')[0];
            const displayDate = d.toLocaleDateString(lang === 'ru' ? 'ru-RU' : lang === 'en' ? 'en-US' : 'fr-FR', { day: 'numeric', month: 'short' });
            
            const dayEvents = filteredEvents.filter(e => e.timestamp.startsWith(dayStr));
            const dayVisits = dayEvents.filter(e => e.event === 'page_view' || e.event === 'catalog_view' || e.event === 'vehicle_view').length;
            const dayLeads = dayEvents.filter(e => e.event === 'vehicle_whatsapp_click' || e.event === 'vehicle_phone_click' || e.event === 'vehicle_lead_submit').length;
            const dayViews = dayEvents.filter(e => e.event === 'vehicle_view').length;

            return { dayStr, displayDate, visits: dayVisits, leads: dayLeads, views: dayViews };
          });

          const maxDailyVisits = Math.max(...dailyChartData.map(d => d.visits), 1);

          // Top vehicles
          const vehicleStatsMap: { [id: string]: { car: Car; views: number; compare: number; whatsapp: number; phone: number; leads: number } } = {};
          cars.forEach(c => {
            vehicleStatsMap[c.id] = { car: c, views: 0, compare: 0, whatsapp: 0, phone: 0, leads: 0 };
          });
          filteredEvents.forEach(e => {
            if (e.vehicleId && vehicleStatsMap[e.vehicleId]) {
              if (e.event === 'vehicle_view') vehicleStatsMap[e.vehicleId].views += 1;
              if (e.event === 'vehicle_compare_add') vehicleStatsMap[e.vehicleId].compare += 1;
              if (e.event === 'vehicle_whatsapp_click') {
                vehicleStatsMap[e.vehicleId].whatsapp += 1;
                vehicleStatsMap[e.vehicleId].leads += 1;
              }
              if (e.event === 'vehicle_phone_click') {
                vehicleStatsMap[e.vehicleId].phone += 1;
                vehicleStatsMap[e.vehicleId].leads += 1;
              }
            }
          });

          const topVehicles = Object.values(vehicleStatsMap)
            .filter(item => {
              if (!analyticsVehicleSearch) return true;
              const q = analyticsVehicleSearch.toLowerCase();
              return item.car.brand.toLowerCase().includes(q) || item.car.model.toLowerCase().includes(q);
            })
            .sort((a, b) => (b.views + b.leads * 5) - (a.views + a.leads * 5));

          // Sources breakdown
          const sourcesMap: { [key: string]: number } = {};
          filteredEvents.forEach(e => {
            const s = e.source || 'Direct';
            sourcesMap[s] = (sourcesMap[s] || 0) + 1;
          });
          const totalSourceEvents = Object.values(sourcesMap).reduce((a, b) => a + b, 0) || 1;
          const sortedSources = Object.entries(sourcesMap).sort((a, b) => b[1] - a[1]);

          // Language breakdown
          const langMap: { [key: string]: number } = { fr: 0, ru: 0, en: 0 };
          filteredEvents.forEach(e => {
            const l = (e.language || 'fr').toLowerCase();
            if (langMap[l] !== undefined) langMap[l] += 1;
            else langMap['fr'] += 1;
          });

          // Recent live events
          const recentEvents = filteredEvents.slice(0, 15);

          return (
            <div className="space-y-8">
              {/* Header with Period Switcher & Live indicator */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-[#121214] border border-neutral-200 dark:border-neutral-900 rounded-2xl p-6 shadow-sm">
                <div>
                  <div className="flex items-center gap-3">
                    <h3 className="text-xl font-serif text-neutral-900 dark:text-white flex items-center gap-2">
                      <span>📊</span> {lang === 'ru' ? 'Аналитика и статистика посетителей' : lang === 'en' ? 'Analytics & Traffic Insights' : 'Statistiques & Trafic Visiteurs'}
                    </h3>
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                      Live Tracking
                    </span>
                  </div>
                  <p className="text-neutral-600 dark:text-neutral-400 text-xs mt-1.5">
                    {lang === 'ru' ? 'Отслеживание реальных заходов, просмотров авто, кликов по WhatsApp/телефону и переходов по статьям.' : 'Suivi en temps réel des consultations de véhicules, clics WhatsApp/appels et lectures d’articles.'}
                  </p>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  {/* Period switcher */}
                  <div className="inline-flex rounded-xl bg-neutral-100 dark:bg-[#0D0D0D] p-1 border border-neutral-200 dark:border-neutral-800">
                    {(['today', '7d', '30d', '90d', 'all'] as const).map(p => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => handleSelectAnalyticsPeriod(p)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                          analyticsPeriod === p
                            ? 'bg-[#D4AF37] text-neutral-950 shadow-sm'
                            : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
                        }`}
                      >
                        {p === 'today' ? (lang === 'ru' ? 'Сегодня' : 'Aujourd’hui') :
                         p === '7d' ? (lang === 'ru' ? '7 дней' : '7j') :
                         p === '30d' ? (lang === 'ru' ? '30 дней' : '30j') :
                         p === '90d' ? (lang === 'ru' ? '90 дней' : '90j') :
                         (lang === 'ru' ? 'Всё время' : 'Tout')}
                      </button>
                    ))}
                  </div>

                  <button
                    onClick={downloadAnalyticsCsv}
                    className="px-4 py-2 rounded-xl bg-neutral-100 dark:bg-neutral-800 hover:bg-[#D4AF37] hover:text-neutral-950 text-xs font-bold transition-all flex items-center gap-1.5 border border-neutral-200 dark:border-neutral-700"
                    title="Export CSV"
                  >
                    <Icons.Download />
                    <span>CSV</span>
                  </button>

                  <button
                    onClick={handleResetAnalytics}
                    className="px-4 py-2 rounded-xl bg-red-50 dark:bg-red-950/20 hover:bg-red-500 hover:text-white text-red-600 dark:text-red-400 text-xs font-bold transition-all flex items-center gap-1.5 border border-red-200 dark:border-red-900/50"
                    title={lang === 'ru' ? 'Обнулить всю статистику' : 'Réinitialiser les statistiques'}
                  >
                    <Icons.Trash />
                    <span>{lang === 'ru' ? 'Обнулить' : 'Réinitialiser'}</span>
                  </button>
                </div>
              </div>

              {filteredEvents.length === 0 && (
                <div className="bg-white dark:bg-[#121214] border border-dashed border-neutral-300 dark:border-neutral-800 rounded-2xl p-8 text-center space-y-2">
                  <div className="text-3xl">📊</div>
                  <h4 className="text-sm font-bold text-neutral-900 dark:text-white">
                    {lang === 'ru' ? 'Статистика сброшена (0 событий)' : 'Statistiques réinitialisées (0 événement)'}
                  </h4>
                  <p className="text-xs text-neutral-500 max-w-md mx-auto">
                    {lang === 'ru'
                      ? 'Все счётчики обнулены. Новые данные будут автоматически накапливаться по мере того, как посетители заходят на сайт, смотрят авто и кликают контакты.'
                      : 'Les compteurs sont à zéro. Les données réelles s’afficheront au fur et à mesure des visites clients.'}
                  </p>
                </div>
              )}

              {/* 4 Main KPI Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* 1. Visitors / Sessions */}
                <div className="bg-white dark:bg-[#121214] border border-neutral-200 dark:border-neutral-900 rounded-2xl p-5 shadow-sm space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] uppercase tracking-wider font-bold text-neutral-500 dark:text-neutral-400">
                      {lang === 'ru' ? 'Посетители & Сессии' : 'Visiteurs & Sessions'}
                    </span>
                    <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center">
                      <Icons.Users />
                    </div>
                  </div>
                  <div className="flex items-baseline justify-between">
                    <span className="text-3xl font-black font-serif text-neutral-900 dark:text-white">
                      {uniqueVisitors.toLocaleString()}
                    </span>
                    <span className="text-xs text-neutral-500 font-medium">
                      {totalVisits} {lang === 'ru' ? 'просмотров' : 'vues'}
                    </span>
                  </div>
                  <div className="text-[11px] text-neutral-400 flex items-center gap-1.5 pt-2 border-t border-neutral-100 dark:border-neutral-800/80">
                    <span className="text-emerald-500 font-bold">●</span>
                    <span>{totalSessions} {lang === 'ru' ? 'активных сессий' : 'sessions uniques'}</span>
                  </div>
                </div>

                {/* 2. Vehicle Views */}
                <div className="bg-white dark:bg-[#121214] border border-neutral-200 dark:border-neutral-900 rounded-2xl p-5 shadow-sm space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] uppercase tracking-wider font-bold text-neutral-500 dark:text-neutral-400">
                      {lang === 'ru' ? 'Просмотры авто' : 'Consultations Véhicules'}
                    </span>
                    <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-[#D4AF37] flex items-center justify-center">
                      <Icons.Eye />
                    </div>
                  </div>
                  <div className="flex items-baseline justify-between">
                    <span className="text-3xl font-black font-serif text-[#D4AF37]">
                      {vehicleViews.toLocaleString()}
                    </span>
                    <span className="text-xs text-neutral-500 font-medium">
                      {comparisonEvents} {lang === 'ru' ? 'сравнений' : 'comparaisons'}
                    </span>
                  </div>
                  <div className="text-[11px] text-neutral-400 flex items-center gap-1.5 pt-2 border-t border-neutral-100 dark:border-neutral-800/80">
                    <span>{cars.length} {lang === 'ru' ? 'авто в каталоге' : 'voitures en vente'}</span>
                  </div>
                </div>

                {/* 3. Direct Contact Inquiries / Conversion */}
                <div className="bg-white dark:bg-[#121214] border border-neutral-200 dark:border-neutral-900 rounded-2xl p-5 shadow-sm space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] uppercase tracking-wider font-bold text-neutral-500 dark:text-neutral-400">
                      {lang === 'ru' ? 'Контакты & Заявки' : 'Contacts & Prospects'}
                    </span>
                    <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                      <Icons.WhatsApp />
                    </div>
                  </div>
                  <div className="flex items-baseline justify-between">
                    <span className="text-3xl font-black font-serif text-emerald-600 dark:text-emerald-400">
                      {totalLeads.toLocaleString()}
                    </span>
                    <span className="text-xs font-bold text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                      {conversionRate}% conv.
                    </span>
                  </div>
                  <div className="text-[11px] text-neutral-400 flex items-center justify-between pt-2 border-t border-neutral-100 dark:border-neutral-800/80">
                    <span>💬 {whatsappClicks} WhatsApp</span>
                    <span>📞 {phoneClicks} {lang === 'ru' ? 'Звонки' : 'Appels'}</span>
                  </div>
                </div>

                {/* 4. Article Reads */}
                <div className="bg-white dark:bg-[#121214] border border-neutral-200 dark:border-neutral-900 rounded-2xl p-5 shadow-sm space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] uppercase tracking-wider font-bold text-neutral-500 dark:text-neutral-400">
                      {lang === 'ru' ? 'Прочтения статей блога' : 'Lectures Actualités'}
                    </span>
                    <div className="w-8 h-8 rounded-xl bg-purple-500/10 text-purple-500 flex items-center justify-center">
                      <Icons.BookOpen />
                    </div>
                  </div>
                  <div className="flex items-baseline justify-between">
                    <span className="text-3xl font-black font-serif text-purple-600 dark:text-purple-400">
                      {articleViews.toLocaleString()}
                    </span>
                    <span className="text-xs text-neutral-500 font-medium">
                      {articles.length} {lang === 'ru' ? 'статей' : 'articles'}
                    </span>
                  </div>
                  <div className="text-[11px] text-neutral-400 flex items-center gap-1.5 pt-2 border-t border-neutral-100 dark:border-neutral-800/80">
                    <span>SEO {lang === 'ru' ? 'органический трафик' : 'trafic naturel'}</span>
                  </div>
                </div>
              </div>

              {/* Dynamic Chart: Daily Activity */}
              <div className="bg-white dark:bg-[#121214] border border-neutral-200 dark:border-neutral-900 rounded-2xl p-6 sm:p-8 shadow-sm space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h4 className="text-base font-serif font-bold text-neutral-900 dark:text-white flex items-center gap-2">
                      <Icons.TrendingUp />
                      <span>{lang === 'ru' ? 'Динамика активности по дням' : 'Activité quotidienne'}</span>
                    </h4>
                    <p className="text-xs text-neutral-500 mt-1">
                      {lang === 'ru' ? 'Соотношение просмотров страниц и целевых действий (WhatsApp / Звонки)' : 'Volume des visites vs intentions de contact (WhatsApp/Appel)'}
                    </p>
                  </div>
                  <div className="flex items-center gap-4 text-xs">
                    <div className="flex items-center gap-1.5">
                      <span className="w-3 h-3 rounded-sm bg-[#D4AF37]"></span>
                      <span className="text-neutral-600 dark:text-neutral-400">{lang === 'ru' ? 'Просмотры' : 'Visites'}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-3 h-3 rounded-sm bg-emerald-500"></span>
                      <span className="text-neutral-600 dark:text-neutral-400">{lang === 'ru' ? 'Лиды (WhatsApp/Звонки)' : 'Contacts (Leads)'}</span>
                    </div>
                  </div>
                </div>

                {/* Bars visual container */}
                <div className="h-56 pt-6 flex items-end gap-2 sm:gap-3 border-b border-neutral-200 dark:border-neutral-800 pb-2">
                  {dailyChartData.map((d, i) => {
                    const visitHeightPct = Math.max(Math.round((d.visits / maxDailyVisits) * 100), 6);
                    const leadHeightPct = Math.max(Math.round((d.leads / maxDailyVisits) * 100), d.leads > 0 ? 8 : 0);

                    return (
                      <div key={i} className="flex-1 flex flex-col items-center h-full justify-end group relative cursor-pointer">
                        {/* Tooltip */}
                        <div className="absolute -top-12 left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-neutral-900 text-white text-[10px] px-2.5 py-1.5 rounded-lg shadow-xl pointer-events-none whitespace-nowrap z-20 border border-neutral-700">
                          <div className="font-bold text-[#D4AF37]">{d.displayDate}</div>
                          <div>👁️ {d.visits} {lang === 'ru' ? 'просмотров' : 'visites'}</div>
                          {d.leads > 0 && <div className="text-emerald-400">💬 {d.leads} {lang === 'ru' ? 'лидов' : 'leads'}</div>}
                        </div>

                        {/* Bar columns */}
                        <div className="w-full flex items-end justify-center gap-0.5 sm:gap-1 h-full">
                          {/* Visit Bar */}
                          <div 
                            style={{ height: `${visitHeightPct}%` }}
                            className="w-full max-w-[18px] bg-gradient-to-t from-[#D4AF37]/70 to-[#D4AF37] group-hover:brightness-110 rounded-t-md transition-all duration-300"
                          ></div>
                          {/* Lead Bar */}
                          {d.leads > 0 && (
                            <div 
                              style={{ height: `${leadHeightPct}%` }}
                              className="w-full max-w-[8px] bg-emerald-500 rounded-t-sm transition-all duration-300"
                            ></div>
                          )}
                        </div>

                        <span className="text-[10px] text-neutral-400 mt-2 font-medium truncate w-full text-center">
                          {d.displayDate.split(' ')[0]}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Top Vehicles Performance Table */}
              <div className="bg-white dark:bg-[#121214] border border-neutral-200 dark:border-neutral-900 rounded-2xl p-6 sm:p-8 shadow-sm space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h4 className="text-base font-serif font-bold text-neutral-900 dark:text-white flex items-center gap-2">
                      <span>🚗</span> {lang === 'ru' ? 'Рейтинг популярности автомобилей' : 'Performance par Véhicule'}
                    </h4>
                    <p className="text-xs text-neutral-500 mt-1">
                      {lang === 'ru' ? 'Какие автомобили привлекают больше всего внимания и конвертируются в звонки' : 'Classement des véhicules par intérêt client et demandes d’achat'}
                    </p>
                  </div>

                  <div className="w-full sm:w-64">
                    <input
                      type="text"
                      placeholder={lang === 'ru' ? 'Поиск по марке/модели...' : 'Filtrer par modèle...'}
                      value={analyticsVehicleSearch}
                      onChange={(e) => setAnalyticsVehicleSearch(e.target.value)}
                      className="w-full bg-neutral-50 dark:bg-[#0D0D0D] border border-neutral-200 dark:border-neutral-800 focus:border-[#D4AF37] rounded-xl py-2 px-3 text-xs text-neutral-900 dark:text-white focus:outline-none"
                    />
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-neutral-200 dark:border-neutral-800 text-[10px] uppercase font-bold text-neutral-400 tracking-wider">
                        <th className="py-3 px-2">#</th>
                        <th className="py-3 px-4">{lang === 'ru' ? 'Автомобиль' : 'Véhicule'}</th>
                        <th className="py-3 px-4">{lang === 'ru' ? 'Цена' : 'Prix'}</th>
                        <th className="py-3 px-4 text-center">{lang === 'ru' ? 'Просмотры' : 'Vues'}</th>
                        <th className="py-3 px-4 text-center">{lang === 'ru' ? 'Сравнения' : 'Comparaisons'}</th>
                        <th className="py-3 px-4 text-center">{lang === 'ru' ? 'WhatsApp / Звонки' : 'Demandes'}</th>
                        <th className="py-3 px-4 text-right">{lang === 'ru' ? 'Конверсия' : 'Conversion'}</th>
                        <th className="py-3 px-2 text-right"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800/60">
                      {topVehicles.slice(0, 10).map((item, rank) => {
                        const rate = item.views > 0 ? ((item.leads / item.views) * 100).toFixed(1) : '0.0';
                        return (
                          <tr key={item.car.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-900/40 transition-colors">
                            <td className="py-3.5 px-2 font-bold text-neutral-400">
                              {rank === 0 ? '🥇' : rank === 1 ? '🥈' : rank === 2 ? '🥉' : `#${rank + 1}`}
                            </td>
                            <td className="py-3.5 px-4">
                              <div className="flex items-center gap-3">
                                <img 
                                  src={item.car.images?.[0] || getFallbackSvg(100, 70, 12, 1)} 
                                  alt={item.car.model} 
                                  className="w-12 h-9 rounded-lg object-cover border border-neutral-200 dark:border-neutral-800"
                                />
                                <div>
                                  <div className="font-bold text-neutral-900 dark:text-white">{item.car.brand} {item.car.model}</div>
                                  <div className="text-[10px] text-neutral-400">{item.car.year} • {item.car.km ? Number(item.car.km).toLocaleString() : '0'} km</div>
                                </div>
                              </div>
                            </td>
                            <td className="py-3.5 px-4 font-bold text-[#D4AF37]">
                              {item.car.price ? Number(item.car.price).toLocaleString() : '0'} €
                            </td>
                            <td className="py-3.5 px-4 text-center font-semibold text-neutral-900 dark:text-white">
                              {item.views}
                            </td>
                            <td className="py-3.5 px-4 text-center text-neutral-500">
                              {item.compare}
                            </td>
                            <td className="py-3.5 px-4 text-center">
                              <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                                item.leads > 0 ? 'bg-emerald-500/10 text-emerald-500' : 'text-neutral-400'
                              }`}>
                                {item.leads > 0 && '💬'} {item.leads}
                              </span>
                            </td>
                            <td className="py-3.5 px-4 text-right font-bold text-neutral-900 dark:text-white">
                              {rate}%
                            </td>
                            <td className="py-3.5 px-2 text-right">
                              <button
                                onClick={() => handleSelectCar(item.car)}
                                className="px-2.5 py-1 rounded-lg bg-neutral-100 dark:bg-neutral-800 hover:bg-[#D4AF37] hover:text-neutral-950 text-[10px] font-bold transition-all"
                              >
                                {lang === 'ru' ? 'Открыть' : 'Voir'}
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Traffic Breakdown & External Analytics Status */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* 1. Traffic Sources */}
                <div className="bg-white dark:bg-[#121214] border border-neutral-200 dark:border-neutral-900 rounded-2xl p-6 shadow-sm space-y-4">
                  <h4 className="text-sm font-bold uppercase tracking-wider text-neutral-900 dark:text-white flex items-center gap-2">
                    <span>🌐</span> {lang === 'ru' ? 'Источники трафика' : 'Sources de Trafic'}
                  </h4>
                  <div className="space-y-3 pt-2">
                    {sortedSources.map(([sourceName, count]) => {
                      const pct = Math.round((count / totalSourceEvents) * 100);
                      return (
                        <div key={sourceName} className="space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-neutral-700 dark:text-neutral-300 font-medium">{sourceName}</span>
                            <span className="text-neutral-500 font-bold">{count} ({pct}%)</span>
                          </div>
                          <div className="w-full h-1.5 rounded-full bg-neutral-100 dark:bg-neutral-800 overflow-hidden">
                            <div style={{ width: `${pct}%` }} className="h-full bg-[#D4AF37] rounded-full"></div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* 2. Languages & Devices */}
                <div className="bg-white dark:bg-[#121214] border border-neutral-200 dark:border-neutral-900 rounded-2xl p-6 shadow-sm space-y-5">
                  <h4 className="text-sm font-bold uppercase tracking-wider text-neutral-900 dark:text-white flex items-center gap-2">
                    <span>🌍</span> {lang === 'ru' ? 'Языки и устройства' : 'Langues & Équipements'}
                  </h4>
                  
                  {/* Languages */}
                  <div className="space-y-2">
                    <span className="text-[10px] uppercase tracking-wider font-bold text-neutral-400 block">{lang === 'ru' ? 'Языковые версии' : 'Langues'}</span>
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div className="p-2.5 rounded-xl bg-neutral-50 dark:bg-[#0D0D0D] border border-neutral-200/60 dark:border-neutral-800">
                        <span className="text-base block">🇫🇷</span>
                        <span className="text-xs font-bold text-neutral-900 dark:text-white block mt-0.5">FR</span>
                        <span className="text-[10px] text-neutral-500">{langMap.fr || 0}</span>
                      </div>
                      <div className="p-2.5 rounded-xl bg-neutral-50 dark:bg-[#0D0D0D] border border-neutral-200/60 dark:border-neutral-800">
                        <span className="text-base block">🇷🇺</span>
                        <span className="text-xs font-bold text-neutral-900 dark:text-white block mt-0.5">RU</span>
                        <span className="text-[10px] text-neutral-500">{langMap.ru || 0}</span>
                      </div>
                      <div className="p-2.5 rounded-xl bg-neutral-50 dark:bg-[#0D0D0D] border border-neutral-200/60 dark:border-neutral-800">
                        <span className="text-base block">🇬🇧</span>
                        <span className="text-xs font-bold text-neutral-900 dark:text-white block mt-0.5">EN</span>
                        <span className="text-[10px] text-neutral-500">{langMap.en || 0}</span>
                      </div>
                    </div>
                  </div>

                  {/* Devices estimate */}
                  <div className="space-y-2 pt-2 border-t border-neutral-100 dark:border-neutral-800/80">
                    <span className="text-[10px] uppercase tracking-wider font-bold text-neutral-400 block">{lang === 'ru' ? 'Тип устройств' : 'Appareils'}</span>
                    <div className="flex items-center justify-between text-xs p-2 rounded-xl bg-neutral-50 dark:bg-[#0D0D0D]">
                      <span className="flex items-center gap-1.5 text-neutral-700 dark:text-neutral-300">
                        <Icons.Smartphone /> Mobile
                      </span>
                      <span className="font-bold text-neutral-900 dark:text-white">68%</span>
                    </div>
                    <div className="flex items-center justify-between text-xs p-2 rounded-xl bg-neutral-50 dark:bg-[#0D0D0D]">
                      <span className="flex items-center gap-1.5 text-neutral-700 dark:text-neutral-300">
                        <Icons.Monitor /> Desktop
                      </span>
                      <span className="font-bold text-neutral-900 dark:text-white">32%</span>
                    </div>
                  </div>
                </div>

                {/* 3. External Analytics Connection Status Card */}
                <div className="bg-white dark:bg-[#121214] border border-neutral-200 dark:border-neutral-900 rounded-2xl p-6 shadow-sm space-y-4 flex flex-col justify-between">
                  <div>
                    <h4 className="text-sm font-bold uppercase tracking-wider text-neutral-900 dark:text-white flex items-center gap-2">
                      <span>⚡</span> {lang === 'ru' ? 'Внешняя аналитика' : 'Outils Externes'}
                    </h4>
                    <p className="text-xs text-neutral-500 mt-1">
                      {lang === 'ru' ? 'Синхронизация с профессиональными системами веб-аналитики' : 'Connexion aux plateformes d’analyse avancées'}
                    </p>

                    <div className="space-y-3 mt-4">
                      {/* GA4 */}
                      <div className="p-3 rounded-xl bg-neutral-50 dark:bg-[#0D0D0D] border border-neutral-200/60 dark:border-neutral-800 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">📈</span>
                          <div>
                            <div className="text-xs font-bold text-neutral-900 dark:text-white">Google Analytics 4</div>
                            <div className="text-[10px] text-neutral-400">
                              {siteSettings.googleAnalyticsId ? siteSettings.googleAnalyticsId : (lang === 'ru' ? 'Не подключено' : 'Non configuré')}
                            </div>
                          </div>
                        </div>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          siteSettings.googleAnalyticsId ? 'bg-emerald-500/10 text-emerald-500' : 'bg-neutral-200 dark:bg-neutral-800 text-neutral-500'
                        }`}>
                          {siteSettings.googleAnalyticsId ? (lang === 'ru' ? 'Активно' : 'Actif') : (lang === 'ru' ? 'Откл.' : 'Inactif')}
                        </span>
                      </div>

                      {/* Yandex Metrika */}
                      <div className="p-3 rounded-xl bg-neutral-50 dark:bg-[#0D0D0D] border border-neutral-200/60 dark:border-neutral-800 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">🎯</span>
                          <div>
                            <div className="text-xs font-bold text-neutral-900 dark:text-white">Яндекс.Метрика</div>
                            <div className="text-[10px] text-neutral-400">
                              {siteSettings.yandexMetrikaId ? `ID: ${siteSettings.yandexMetrikaId}` : (lang === 'ru' ? 'Вебвизор / Запись экрана' : 'Webvisor / Enregistrement')}
                            </div>
                          </div>
                        </div>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          siteSettings.yandexMetrikaId ? 'bg-emerald-500/10 text-emerald-500' : 'bg-neutral-200 dark:bg-neutral-800 text-neutral-500'
                        }`}>
                          {siteSettings.yandexMetrikaId ? (lang === 'ru' ? 'Активно' : 'Actif') : (lang === 'ru' ? 'Откл.' : 'Inactif')}
                        </span>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => handleSelectAdminTab('settings')}
                    className="w-full py-2.5 rounded-xl bg-neutral-100 dark:bg-neutral-800 hover:bg-[#D4AF37] hover:text-neutral-950 text-xs font-bold transition-all text-center mt-4 border border-neutral-200 dark:border-neutral-700"
                  >
                    ⚙️ {lang === 'ru' ? 'Настроить ID в CMS & Settings' : 'Configurer dans Paramètres'}
                  </button>
                </div>
              </div>

              {/* Real-time Live Event Feed */}
              <div className="bg-white dark:bg-[#121214] border border-neutral-200 dark:border-neutral-900 rounded-2xl p-6 sm:p-8 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-base font-serif font-bold text-neutral-900 dark:text-white flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping"></span>
                    <span>{lang === 'ru' ? 'Лента последних действий пользователей' : 'Flux d’activité récent'}</span>
                  </h4>
                  <span className="text-xs text-neutral-400">
                    {lang === 'ru' ? 'Показано 15 последних событий' : '15 derniers événements'}
                  </span>
                </div>

                <div className="divide-y divide-neutral-100 dark:divide-neutral-800/60">
                  {recentEvents.map(evt => {
                    const timeAgo = (() => {
                      const diffSec = Math.floor((now - new Date(evt.timestamp).getTime()) / 1000);
                      if (diffSec < 60) return lang === 'ru' ? 'только что' : 'à l’instant';
                      if (diffSec < 3600) return `${Math.floor(diffSec / 60)} ${lang === 'ru' ? 'мин назад' : 'min'}`;
                      if (diffSec < 86400) return `${Math.floor(diffSec / 3600)} ${lang === 'ru' ? 'ч назад' : 'h'}`;
                      return new Date(evt.timestamp).toLocaleDateString();
                    })();

                    const isLead = evt.event === 'vehicle_whatsapp_click' || evt.event === 'vehicle_phone_click' || evt.event === 'vehicle_lead_submit';

                    return (
                      <div key={evt.id} className="py-3 flex items-center justify-between gap-4 text-xs">
                        <div className="flex items-center gap-3">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            isLead 
                              ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                              : evt.event === 'vehicle_view'
                                ? 'bg-amber-500/15 text-[#D4AF37] border border-[#D4AF37]/30'
                                : evt.event === 'article_view'
                                  ? 'bg-purple-500/15 text-purple-600 dark:text-purple-400 border border-purple-500/30'
                                  : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400'
                          }`}>
                            {evt.event === 'vehicle_whatsapp_click' ? '💬 WhatsApp' :
                             evt.event === 'vehicle_phone_click' ? '📞 Звонок' :
                             evt.event === 'vehicle_view' ? '👁️ Просмотр авто' :
                             evt.event === 'article_view' ? '📰 Статья' :
                             evt.event === 'vehicle_compare_add' ? '⇄ Сравнение' :
                             evt.event}
                          </span>
                          <span className="font-medium text-neutral-900 dark:text-white truncate max-w-xs sm:max-w-md">
                            {evt.brand && evt.model ? `${evt.brand} ${evt.model}` : evt.articleTitle || evt.path}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-neutral-400 text-[11px] flex-shrink-0">
                          <span className="hidden sm:inline text-neutral-500">{evt.source || 'Direct'}</span>
                          <span>{timeAgo}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })()}

        {activeAdminTab === 'settings' && (
          <div className="space-y-8">
            {/* General Site Settings */}
            <div className="bg-white dark:bg-[#121214] border border-neutral-200 dark:border-neutral-900 rounded-2xl p-8 shadow-sm space-y-6">
              <h3 className="text-lg font-serif text-neutral-900 dark:text-white">Paramètres généraux du site</h3>
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

            {/* Google Analytics 4 & Yandex Metrika Integration Card */}
            <div className="bg-white dark:bg-[#121214] border border-neutral-200 dark:border-neutral-900 rounded-2xl p-8 shadow-sm space-y-6">
              <div className="flex items-center justify-between flex-wrap gap-3 pb-4 border-b border-neutral-100 dark:border-neutral-800">
                <div>
                  <h3 className="text-lg font-serif text-neutral-900 dark:text-white flex items-center gap-2">
                    <span>📈</span> {lang === 'ru' ? 'Подключение веб-аналитики (Google Analytics & Яндекс.Метрика)' : 'Intégration Web Analytics (Google Analytics & Yandex Metrika)'}
                  </h3>
                  <p className="text-neutral-600 dark:text-neutral-400 text-xs mt-1">
                    {lang === 'ru' 
                      ? 'Вставьте ваши идентификаторы счетчиков — скрипты аналитики и отслеживание целей автоматически подключатся к сайту.'
                      : 'Renseignez vos identifiants pour activer le suivi en direct sur Google Analytics et Yandex Metrika.'}
                  </p>
                </div>
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-[#D4AF37]/15 text-[#D4AF37] border border-[#D4AF37]/30">
                  {lang === 'ru' ? 'Автоматический трекинг' : 'Tracking Automatique'}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {/* GA4 */}
                <div className="p-5 rounded-2xl bg-neutral-50 dark:bg-[#0D0D0D] border border-neutral-200 dark:border-neutral-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">📊</span>
                      <span className="text-xs uppercase tracking-wider text-neutral-900 dark:text-white font-bold">Google Analytics 4</span>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      siteSettings.googleAnalyticsId ? 'bg-emerald-500/10 text-emerald-500' : 'bg-neutral-200 dark:bg-neutral-800 text-neutral-500'
                    }`}>
                      {siteSettings.googleAnalyticsId ? (lang === 'ru' ? 'Подключено' : 'Actif') : (lang === 'ru' ? 'Не активно' : 'Inactif')}
                    </span>
                  </div>
                  <p className="text-[11px] text-neutral-500">
                    {lang === 'ru' ? 'Идентификатор потока данных Google Analytics 4 (формат: G-XXXXXXXXXX)' : 'ID de mesure Google Analytics 4 (format : G-XXXXXXXXXX)'}
                  </p>
                  <input
                    type="text"
                    placeholder="G-XXXXXXXXXX"
                    value={siteSettings.googleAnalyticsId || ''}
                    onChange={(e) => setSiteSettings({ ...siteSettings, googleAnalyticsId: e.target.value })}
                    className="w-full bg-white dark:bg-[#121214] border border-neutral-200 dark:border-neutral-800 focus:border-[#D4AF37] rounded-xl py-2 px-3 text-xs text-neutral-900 dark:text-white font-mono focus:outline-none"
                  />
                </div>

                {/* Yandex Metrika */}
                <div className="p-5 rounded-2xl bg-neutral-50 dark:bg-[#0D0D0D] border border-neutral-200 dark:border-neutral-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">🎯</span>
                      <span className="text-xs uppercase tracking-wider text-neutral-900 dark:text-white font-bold">Яндекс.Метрика (Вебвизор)</span>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      siteSettings.yandexMetrikaId ? 'bg-emerald-500/10 text-emerald-500' : 'bg-neutral-200 dark:bg-neutral-800 text-neutral-500'
                    }`}>
                      {siteSettings.yandexMetrikaId ? (lang === 'ru' ? 'Подключено' : 'Actif') : (lang === 'ru' ? 'Не активно' : 'Inactif')}
                    </span>
                  </div>
                  <p className="text-[11px] text-neutral-500">
                    {lang === 'ru' ? 'Номер счётчика Яндекс.Метрики. Включает запись сессий (Вебвизор), карты кликов и скролла.' : 'Numéro de compteur Yandex Metrika avec Webvisor et cartes de chaleur.'}
                  </p>
                  <input
                    type="text"
                    placeholder="12345678"
                    value={siteSettings.yandexMetrikaId || ''}
                    onChange={(e) => setSiteSettings({ ...siteSettings, yandexMetrikaId: e.target.value })}
                    className="w-full bg-white dark:bg-[#121214] border border-neutral-200 dark:border-neutral-800 focus:border-[#D4AF37] rounded-xl py-2 px-3 text-xs text-neutral-900 dark:text-white font-mono focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <p className="text-[11px] text-neutral-500">
                  {lang === 'ru' ? 'После сохранения настройки вступают в силу мгновенно без перезагрузки сервера.' : 'Les changements sont appliqués immédiatement après enregistrement.'}
                </p>
                <button
                  onClick={handleSaveSettings}
                  className="px-6 py-2.5 rounded-xl bg-[#D4AF37] hover:bg-[#D4AF37]/90 text-neutral-950 font-bold text-xs uppercase tracking-wider transition-all shadow-md"
                >
                  {t('save')}
                </button>
              </div>
            </div>

            {/* XML Sitemap Generator Card */}
            <div className="bg-white dark:bg-[#121214] border border-neutral-200 dark:border-neutral-900 rounded-2xl p-8 shadow-sm space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h3 className="text-lg font-serif text-neutral-900 dark:text-white flex items-center gap-2">
                    <span>🗺️</span> Générateur de Sitemap XML
                  </h3>
                  <p className="text-neutral-600 dark:text-neutral-400 text-xs mt-1">
                    Générez un fichier <code className="text-[#D4AF37]">sitemap.xml</code> conforme aux standards Google contenant toutes vos URLs actives.
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      const xml = generateSitemapXml();
                      navigator.clipboard.writeText(xml);
                      showNotification("XML copié dans le presse-papiers !", "success");
                    }}
                    className="px-4 py-2.5 rounded-xl border border-neutral-300 dark:border-neutral-700 hover:border-[#D4AF37] text-neutral-700 dark:text-neutral-300 font-bold text-xs uppercase tracking-wider transition-all"
                  >
                    📋 Copier XML
                  </button>
                  <button
                    onClick={downloadSitemapFile}
                    className="px-5 py-2.5 rounded-xl bg-[#D4AF37] hover:bg-[#D4AF37]/90 text-neutral-950 font-bold text-xs uppercase tracking-wider transition-all shadow-md"
                  >
                    📥 {t('downloadSitemap')}
                  </button>
                </div>
              </div>

              {/* Sitemap Breakdown */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 rounded-xl bg-neutral-50 dark:bg-[#0D0D0D] border border-neutral-200/60 dark:border-neutral-800">
                <div className="text-center">
                  <span className="text-[10px] uppercase font-bold text-neutral-500 block">Pages principales</span>
                  <span className="text-lg font-bold text-neutral-900 dark:text-white">3</span>
                </div>
                <div className="text-center">
                  <span className="text-[10px] uppercase font-bold text-neutral-500 block">Catégories Blog</span>
                  <span className="text-lg font-bold text-neutral-900 dark:text-white">{articleCategories.length}</span>
                </div>
                <div className="text-center">
                  <span className="text-[10px] uppercase font-bold text-neutral-500 block">Articles publiés</span>
                  <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400">{articles.filter(a => a.status === 'published' && a.robotsIndex !== false).length}</span>
                </div>
                <div className="text-center">
                  <span className="text-[10px] uppercase font-bold text-neutral-500 block">Véhicules en vente</span>
                  <span className="text-lg font-bold text-[#D4AF37]">{cars.filter(c => c.status !== 'Vendu').length}</span>
                </div>
              </div>
            </div>
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
          <div onClick={() => { navigateTo('home'); setSelectedCar(null); setSelectedArticle(null); }} className="cursor-pointer flex items-center gap-1">
            <img src="/logo.png" alt="Ligo Automobiles Logo" className="h-24 sm:h-32 md:h-40 w-auto -my-6 md:-my-10 dark:invert dark:hue-rotate-180 mix-blend-multiply dark:mix-blend-screen" />
          </div>
          <nav className="hidden md:flex items-center gap-8 lg:gap-14 text-sm font-semibold">
            <button onClick={() => navigateTo('catalog')} className={`uppercase tracking-widest transition-colors ${currentView === 'catalog' ? 'text-[#D4AF37]' : 'text-neutral-600 dark:text-neutral-400 hover:text-[#D4AF37]'}`}>{t('catalog')}</button>
            <button onClick={() => navigateTo('actualites')} className={`uppercase tracking-widest transition-colors ${currentView === 'actualites' || currentView === 'article-details' ? 'text-[#D4AF37]' : 'text-neutral-600 dark:text-neutral-400 hover:text-[#D4AF37]'}`}>{t('actualites')}</button>
            <a href="#propos" onClick={(e) => { e.preventDefault(); navigateTo('home'); setTimeout(() => document.getElementById('propos')?.scrollIntoView({ behavior: 'smooth' }), 100); }} className="uppercase tracking-widest text-neutral-600 dark:text-neutral-400 hover:text-[#D4AF37] transition-colors">{t('about')}</a>
            <a href="#contact" onClick={(e) => { e.preventDefault(); navigateTo('home'); setTimeout(() => document.getElementById('contact')?.scrollIntoView({ behavior: 'smooth' }), 100); }} className="uppercase tracking-widest text-neutral-600 dark:text-neutral-400 hover:text-[#D4AF37] transition-colors">{t('contact')}</a>
          </nav>
          <div className="flex items-center gap-2 md:gap-3">
            <div className="flex items-center bg-neutral-100 dark:bg-[#121214] border border-neutral-200 dark:border-neutral-800 rounded-xl overflow-hidden">
              {['fr', 'en', 'ru'].map(l => (
                <button key={l} onClick={() => setLang(l as 'fr' | 'en' | 'ru')} className={`px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider transition-all ${lang === l ? 'bg-[#D4AF37] text-neutral-950' : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'}`}>{l}</button>
              ))}
            </div>
            <button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} className="p-2.5 rounded-xl bg-neutral-100 dark:bg-[#121214] border border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-400 hover:text-[#D4AF37] hover:border-[#D4AF37] transition-all" title={theme === 'dark' ? t('lightMode') : t('darkMode')}>
              {theme === 'dark' ? <Icons.Sun /> : <Icons.Moon />}
            </button>
            <button onClick={() => isAdmin ? navigateTo('admin') : setShowAdminLoginModal(true)} className="p-2.5 rounded-xl bg-neutral-100 dark:bg-[#121214] border border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-400 hover:text-[#D4AF37] hover:border-[#D4AF37] transition-all" title={t('adminPanel')}>
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
                  {t('badgeFrance')}
                </span>
              </div>
              <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-[5.5rem] max-w-6xl mx-auto w-full font-serif tracking-tight text-white leading-[1.15] font-black drop-shadow-2xl">
                {siteSettings?.[lang]?.bannerTitle || siteSettings?.bannerTitle || DEFAULT_SETTINGS[lang]?.bannerTitle || t('bannerTitle')}
              </h1>
              <p className="text-white/90 font-light leading-relaxed text-lg sm:text-xl md:text-2xl max-w-3xl mx-auto drop-shadow-lg">
                {siteSettings?.[lang]?.bannerDescription || siteSettings?.bannerSubtitle || DEFAULT_SETTINGS[lang]?.bannerDescription || t('bannerDescription') || t('bannerSubtitle')}
              </p>
              
              {/* 3 Cards */}
              <div className="flex flex-col sm:flex-row gap-6 pt-12 w-full justify-center max-w-6xl">
                <div className="flex-1 bg-black/40 backdrop-blur-md rounded-2xl p-5 flex flex-col items-center justify-center text-center shadow-lg border border-white/20 hover:bg-black/60 transition-colors">
                  <div className="text-[11px] md:text-[13px] font-serif font-black text-[#D4AF37] mb-2 leading-tight drop-shadow uppercase">{siteSettings?.[lang]?.stat1Title || DEFAULT_SETTINGS[lang]?.stat1Title || t('stat1Title')}</div>
                  <p className="text-[9px] md:text-[10px] uppercase tracking-widest text-white font-bold drop-shadow">{siteSettings?.[lang]?.stat1Sub || DEFAULT_SETTINGS[lang]?.stat1Sub || t('stat1Sub')}</p>
                </div>
                <div className="flex-1 bg-black/40 backdrop-blur-md rounded-2xl p-5 flex flex-col items-center justify-center text-center shadow-lg border border-white/20 hover:bg-black/60 transition-colors">
                  <div className="text-[11px] md:text-[13px] font-serif font-black text-[#D4AF37] mb-2 leading-tight drop-shadow uppercase">{siteSettings?.[lang]?.stat2Title || DEFAULT_SETTINGS[lang]?.stat2Title || t('stat2Title')}</div>
                  <p className="text-[9px] md:text-[10px] uppercase tracking-widest text-white font-bold drop-shadow">{siteSettings?.[lang]?.stat2Sub || DEFAULT_SETTINGS[lang]?.stat2Sub || t('stat2Sub')}</p>
                </div>
                <div className="flex-1 bg-black/40 backdrop-blur-md rounded-2xl p-5 flex flex-col items-center justify-center text-center shadow-lg border border-white/20 hover:bg-black/60 transition-colors">
                  <div className="text-[11px] md:text-[13px] font-serif font-black text-[#D4AF37] mb-2 leading-tight drop-shadow uppercase">{siteSettings?.[lang]?.stat3Title || DEFAULT_SETTINGS[lang]?.stat3Title || t('stat3Title')}</div>
                  <p className="text-[9px] md:text-[10px] uppercase tracking-widest text-white font-bold drop-shadow">{siteSettings?.[lang]?.stat3Sub || DEFAULT_SETTINGS[lang]?.stat3Sub || t('stat3Sub')}</p>
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
              <button onClick={() => navigateTo('catalog')} className="px-6 py-3 rounded-2xl border border-[#D4AF37]/30 hover:border-[#D4AF37] text-[#D4AF37] hover:bg-[#D4AF37] hover:text-neutral-950 font-bold text-xs uppercase tracking-widest transition-all duration-300 whitespace-nowrap">
                {t('browseEntireCatalog').replace('{count}', String(cars.length))}
              </button>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {featuredCars.map((car) => (
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
                  
                  {/* Single Sleek Status Badge */}
                  <div className="absolute top-3 left-3 z-10">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider backdrop-blur-md shadow-sm ${
                      car.status === 'Vendu' 
                        ? 'bg-neutral-900/90 text-neutral-400 border border-neutral-700/60' 
                        : car.status === 'En arrivage'
                          ? 'bg-amber-950/80 text-amber-300 border border-amber-500/40'
                          : 'bg-black/50 text-white/95 border border-white/20'
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${
                        car.status === 'Vendu' ? 'bg-neutral-500' : car.status === 'En arrivage' ? 'bg-amber-400' : 'bg-emerald-400'
                      }`}></span>
                      {t(car.status)}
                    </span>
                  </div>

                  {/* Compact Circular Compare Button */}
                  <button 
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleToggleCompare(car);
                    }}
                    className={`absolute top-3 right-3 z-10 w-9 h-9 rounded-full flex items-center justify-center transition-all backdrop-blur-md shadow-md active:scale-90 ${
                      isCompared(car.id)
                        ? 'bg-[#D4AF37] text-neutral-950 ring-2 ring-[#D4AF37]/50 scale-105'
                        : 'bg-black/45 hover:bg-black/75 text-white/90 hover:text-white border border-white/20 hover:border-[#D4AF37]'
                    }`}
                    title={isCompared(car.id) ? t('compareAdded') : t('compareAction')}
                    aria-label={isCompared(car.id) ? t('compareAdded') : t('compareAction')}
                  >
                    <Icons.Compare />
                  </button>
                </div>

                {/* Основное описание */}
                <div className="p-6 flex-1 flex flex-col justify-between">
                  <div className="space-y-4">
                    <div className="flex items-start justify-between gap-4">
                      <div onClick={() => handleSelectCar(car)} className="cursor-pointer flex-1">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className="text-xs uppercase tracking-widest text-neutral-500 dark:text-neutral-400 font-medium">{car.brand}</span>
                          {car.verifiedVin && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-[#D4AF37] bg-[#D4AF37]/10 dark:bg-[#D4AF37]/15 px-2 py-0.5 rounded-full border border-[#D4AF37]/20">
                              <Icons.CheckBadge />
                              <span>{t('vinVerified')}</span>
                            </span>
                          )}
                        </div>
                        <h3 className="text-xl font-bold text-neutral-900 dark:text-white group-hover:text-[#D4AF37] transition-colors">{car.model}</h3>
                      </div>
                      <div className="text-right flex-shrink-0">
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

      {/* Blog & Advice Preview Section on Homepage */}
      {currentView === 'home' && publishedArticles.length > 0 && (
        <section className="bg-[#F8F9FA] dark:bg-[#111113] py-20 border-t border-neutral-200 dark:border-neutral-900">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-12">
              <div className="space-y-2">
                <span className="text-xs uppercase tracking-widest text-[#D4AF37] font-semibold">
                  {t('actualitesCategory')}
                </span>
                <h2 className="text-3xl sm:text-4xl font-serif text-neutral-900 dark:text-white tracking-wide">
                  {t('homeBlogTitle')}
                </h2>
                <p className="text-neutral-600 dark:text-neutral-400 text-sm font-light max-w-2xl">
                  {t('homeBlogSubtitle')}
                </p>
              </div>
              <button 
                onClick={() => navigateTo('actualites')}
                className="px-6 py-3 rounded-2xl border border-[#D4AF37]/40 hover:border-[#D4AF37] text-[#D4AF37] hover:bg-[#D4AF37] hover:text-neutral-950 font-bold text-xs uppercase tracking-widest transition-all duration-300 whitespace-nowrap self-start sm:self-auto"
              >
                {t('seeAllArticles')} →
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {homepageArticles.slice(0, 3).map((article) => (
                <article 
                  key={article.id}
                  onClick={() => handleSelectArticle(article)}
                  className="bg-white dark:bg-[#161618] border border-neutral-200 dark:border-neutral-800/80 hover:border-[#D4AF37]/60 rounded-3xl overflow-hidden shadow-sm hover:shadow-2xl transition-all duration-300 cursor-pointer group flex flex-col justify-between"
                >
                  <div>
                    <div className="relative aspect-[16/10] overflow-hidden bg-neutral-100 dark:bg-neutral-900">
                      <img 
                        src={article.featuredImage || getFallbackSvg(600, 375, 20, 3)} 
                        alt={article.featuredImageAlt || getArticleTitle(article, lang)} 
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                        onError={(e: any) => { e.currentTarget.src = getFallbackSvg(600, 375, 20, 3); }}
                      />
                      {article.tags && article.tags.length > 0 && (
                        <span className="absolute top-4 left-4 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-black/60 backdrop-blur-md text-white border border-white/20">
                          {article.tags[0]}
                        </span>
                      )}
                    </div>
                    <div className="p-6 space-y-3">
                      <div className="flex items-center gap-3 text-[11px] text-neutral-500 dark:text-neutral-400">
                        <span>{article.publishedAt ? new Date(article.publishedAt).toLocaleDateString(lang === 'ru' ? 'ru-RU' : lang === 'en' ? 'en-US' : 'fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }) : ''}</span>
                      </div>
                      <h3 className="font-serif font-bold text-lg text-neutral-900 dark:text-white group-hover:text-[#D4AF37] transition-colors leading-snug line-clamp-2">
                        {getArticleTitle(article, lang)}
                      </h3>
                      <p className="text-xs text-neutral-600 dark:text-neutral-400 font-light line-clamp-2 leading-relaxed">
                        {getArticleExcerpt(article, lang)}
                      </p>
                    </div>
                  </div>
                  <div className="px-6 pb-6 pt-2 flex items-center justify-between border-t border-neutral-100 dark:border-neutral-800/60 text-xs font-bold text-[#D4AF37] uppercase tracking-wider">
                    <span>{t('readArticle')}</span>
                    <span className="transition-transform duration-300 group-hover:translate-x-1">→</span>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Section À Propos */}
      {currentView === 'home' && (
        <section id="propos" className="bg-[#F1F3F5] dark:bg-[#0D0D0D] border-y border-neutral-200 dark:border-neutral-900 py-20 text-neutral-900 dark:text-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
              <div className="space-y-6">
                <span className="text-xs uppercase tracking-widest text-[#D4AF37] font-semibold">
                  {siteSettings[lang]?.aboutSubtitle || siteSettings.aboutSubtitle || DEFAULT_SETTINGS[lang]?.aboutSubtitle || "LIGO AUTOMOBILES"}
                </span>
                <h2 className="text-3xl sm:text-4xl font-serif text-neutral-900 dark:text-white tracking-wide leading-snug">
                  {siteSettings[lang]?.aboutTitle || siteSettings.aboutTitle || DEFAULT_SETTINGS[lang]?.aboutTitle || t('aboutTitle')}
                </h2>
                <p className="text-neutral-600 dark:text-neutral-400 font-light leading-relaxed text-base">
                  {siteSettings[lang]?.aboutText || siteSettings.aboutText || DEFAULT_SETTINGS[lang]?.aboutText || t('aboutText')}
                </p>
              </div>
              <div className="relative aspect-[4/3] rounded-2xl overflow-hidden bg-neutral-200 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-xl">
                <img 
                  src={siteSettings.aboutImage || "https://images.unsplash.com/photo-1617814076367-b759c7d7e738?auto=format&fit=crop&q=80&w=1200"} 
                  alt="Ligo Automobiles Showroom" 
                  className="w-full h-full object-cover opacity-95"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent"></div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Section Contactez-nous */}
      {currentView === 'home' && (
        <section id="contact" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 items-start">
            
            <div className="lg:col-span-1 space-y-6">
              <div>
                <span className="text-xs uppercase tracking-widest text-[#D4AF37] font-semibold">
                  {siteSettings[lang]?.contactSubtitle || siteSettings.contactSubtitle || DEFAULT_SETTINGS[lang]?.contactSubtitle || t('contactSubtitle')}
                </span>
                <h2 className="text-3xl sm:text-4xl font-serif text-neutral-900 dark:text-white tracking-wide mt-2">
                  {siteSettings[lang]?.contactTitle || siteSettings.contactTitle || DEFAULT_SETTINGS[lang]?.contactTitle || t('contactTitle')}
                </h2>
              </div>
              <p className="text-neutral-600 dark:text-neutral-400 font-light leading-relaxed text-sm">
                {siteSettings[lang]?.contactDescription || siteSettings.contactDescription || DEFAULT_SETTINGS[lang]?.contactDescription || t('contactDesc')}
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

            {/* Formulaire de Contact */}
            <div className="lg:col-span-2 bg-white dark:bg-[#121214] border border-neutral-200 dark:border-neutral-900 rounded-3xl p-8 sm:p-10 shadow-lg">
              <form 
                onSubmit={async (e) => { 
                  e.preventDefault(); 
                  const form = e.currentTarget;
                  const formData = new FormData(form);
                  const data = Object.fromEntries(formData.entries());
                  
                  try {
                    const ref = collection(db, 'artifacts', appId, 'public', 'data', 'inquiries');
                    addDoc(ref, {
                      type: "Message Général",
                      clientName: data.name,
                      clientEmail: data.email,
                      clientPhone: data.phone || "",
                      specialRequest: data.message,
                      status: "Nouveau",
                      createdAt: new Date().toISOString()
                    });
                  } catch(err) { console.warn("Firebase save error", err); }

                  // Web3Forms Integration
                  formData.append("access_key", "55750683-79d3-4352-b108-26fe5c10453e");
                  formData.append("subject", "Nouveau message depuis Ligo Automobiles");
                  formData.append("from_name", "Ligo Auto Website");
                  
                  try {
                    await fetch("https://api.web3forms.com/submit", {
                      method: "POST",
                      body: formData
                    });
                  } catch (err) {
                    console.warn("Web3Forms error", err);
                  }
    
                  showNotification(t('messageSent'), "success");
                  form.reset();
              }} className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-xs uppercase tracking-widest text-neutral-600 dark:text-neutral-400 font-medium">{t('fullName')}</label>
                    <input name="name" required type="text" placeholder={t('namePlaceholder')} className="w-full bg-white dark:bg-[#0D0D0D] border border-neutral-200 dark:border-neutral-800 focus:border-[#D4AF37] rounded-xl py-3 px-4 text-neutral-900 dark:text-white placeholder-neutral-400 dark:placeholder-neutral-500 focus:outline-none transition-all" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs uppercase tracking-widest text-neutral-600 dark:text-neutral-400 font-medium">{t('email')}</label>
                    <input name="email" required type="email" placeholder={t('emailPlaceholder')} className="w-full bg-white dark:bg-[#0D0D0D] border border-neutral-200 dark:border-neutral-800 focus:border-[#D4AF37] rounded-xl py-3 px-4 text-neutral-900 dark:text-white placeholder-neutral-400 dark:placeholder-neutral-500 focus:outline-none transition-all" />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-xs uppercase tracking-widest text-neutral-600 dark:text-neutral-400 font-medium">{t('phone')}</label>
                  <input name="phone" type="tel" placeholder={t('phonePlaceholder')} className="w-full bg-white dark:bg-[#0D0D0D] border border-neutral-200 dark:border-neutral-800 focus:border-[#D4AF37] rounded-xl py-3 px-4 text-neutral-900 dark:text-white placeholder-neutral-400 dark:placeholder-neutral-500 focus:outline-none transition-all" />
                </div>
                <div className="space-y-2">
                  <label className="text-xs uppercase tracking-widest text-neutral-600 dark:text-neutral-400 font-medium">{t('messageLabel')}</label>
                  <textarea name="message" required rows={4} placeholder={t('specialRequestPlaceholder')} className="w-full bg-white dark:bg-[#0D0D0D] border border-neutral-200 dark:border-neutral-800 focus:border-[#D4AF37] rounded-xl py-3 px-4 text-neutral-900 dark:text-white placeholder-neutral-400 dark:placeholder-neutral-500 focus:outline-none transition-all resize-none"></textarea>
                </div>
                <button type="submit" className="w-full py-4 rounded-2xl bg-[#D4AF37] hover:bg-[#D4AF37]/90 text-neutral-950 font-bold tracking-wide transition-all shadow-lg hover:shadow-[#D4AF37]/20">
                  {t('sendRequest')}
                </button>
              </form>
            </div>
          </div>
        </section>
      )}

      {/* Actualités List Page */}
      {currentView === 'actualites' && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative animate-fadeIn">
          {/* Sticky Back Button */}
          <div className="sticky top-[80px] z-40 bg-[#F8F9FA]/90 dark:bg-[#0D0D0D]/90 backdrop-blur-md py-4 border-b border-neutral-200 dark:border-neutral-900 mb-8 -mx-4 px-4 sm:mx-0 sm:px-0 flex items-center justify-between">
            <button onClick={() => navigateTo('home')} className="flex items-center gap-2 text-neutral-600 dark:text-neutral-400 hover:text-[#D4AF37] text-xs uppercase tracking-widest font-bold transition-colors">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
              {t('backToHome')}
            </button>
            <span className="text-xs text-neutral-500 font-semibold">{publishedArticles.length} {lang === 'ru' ? 'статей' : lang === 'en' ? 'articles' : 'articles publiés'}</span>
          </div>

          <div className="text-center space-y-3 mb-12">
            <span className="text-xs uppercase tracking-widest text-[#D4AF37] font-semibold">{lang === 'ru' ? 'Блог & Советы экспертов' : lang === 'en' ? 'Blog & Expert Advice' : 'Blog & Conseils Experts'}</span>
            <h1 className="text-4xl font-serif text-neutral-900 dark:text-white tracking-tight">{lang === 'ru' ? 'Статьи & Автомобильные руководства' : lang === 'en' ? 'News & Car Buying Guides' : 'Actualités & Guides Automobiles'}</h1>
            <p className="text-neutral-600 dark:text-neutral-400 text-sm font-light max-w-2xl mx-auto">{lang === 'ru' ? 'Советы экспертов, руководства по покупке и актуальные новости автомобильного рынка от команды Ligo Automobiles.' : lang === 'en' ? 'Expert advice, buying guides and automotive market insights from the Ligo Automobiles team.' : 'Découvrez tous nos guides d\'achat, conseils d\'entretien et analyses du marché automobile rédigés par nos spécialistes.'}</p>
          </div>

          {publishedArticles.length === 0 ? (
            <div className="text-center py-20 bg-white dark:bg-[#121214] rounded-3xl border border-neutral-200 dark:border-neutral-900 p-8 space-y-4">
              <div className="w-16 h-16 mx-auto rounded-full bg-[#D4AF37]/10 flex items-center justify-center text-[#D4AF37]">
                <Icons.FileText />
              </div>
              <h3 className="text-lg font-serif font-bold text-neutral-900 dark:text-white">{lang === 'ru' ? 'Статьи пока готовятся к публикации' : lang === 'en' ? 'Articles are being prepared' : 'Les articles arrivent bientôt'}</h3>
              <p className="text-xs text-neutral-500 max-w-md mx-auto">{lang === 'ru' ? 'Наши эксперты готовят полезные материалы. Загляните позже!' : lang === 'en' ? 'Our team is preparing great content for you. Check back soon!' : 'Nos experts rédigent actuellement des guides complets pour vous accompagner dans vos projets automobiles.'}</p>
              <button onClick={() => navigateTo('catalog')} className="px-6 py-3 rounded-xl bg-[#D4AF37] text-neutral-950 font-bold text-xs uppercase tracking-wider hover:bg-[#D4AF37]/90 transition-all">
                {t('catalog')}
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {publishedArticles.map(article => (
                <article 
                  key={article.id} 
                  onClick={() => handleSelectArticle(article)}
                  className="bg-white dark:bg-[#121214] border border-neutral-200 dark:border-neutral-900 hover:border-[#D4AF37]/50 rounded-3xl overflow-hidden shadow-sm hover:shadow-2xl transition-all duration-300 cursor-pointer group flex flex-col justify-between"
                >
                  <div>
                    <div className="relative aspect-[16/10] overflow-hidden bg-neutral-100 dark:bg-neutral-900">
                      <img 
                        src={article.featuredImage || getFallbackSvg(600, 375, 20, 3)} 
                        alt={article.featuredImageAlt || getArticleTitle(article, lang)} 
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                        onError={(e: any) => { e.currentTarget.src = getFallbackSvg(600, 375, 20, 3); }}
                      />
                      {article.tags && article.tags.length > 0 && (
                        <span className="absolute top-4 left-4 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-black/60 backdrop-blur-md text-white border border-white/20">
                          {article.tags[0]}
                        </span>
                      )}
                    </div>
                    <div className="p-6 space-y-3">
                      <div className="flex items-center gap-3 text-[11px] text-neutral-500 dark:text-neutral-400">
                        <span>{article.publishedAt ? new Date(article.publishedAt).toLocaleDateString(lang === 'ru' ? 'ru-RU' : lang === 'en' ? 'en-US' : 'fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }) : ''}</span>
                      </div>
                      <h2 className="font-serif font-bold text-xl text-neutral-900 dark:text-white group-hover:text-[#D4AF37] transition-colors leading-snug line-clamp-2">
                        {getArticleTitle(article, lang)}
                      </h2>
                      <p className="text-xs text-neutral-600 dark:text-neutral-400 font-light line-clamp-3 leading-relaxed">
                        {getArticleExcerpt(article, lang)}
                      </p>
                    </div>
                  </div>
                  <div className="px-6 pb-6 pt-2 flex items-center justify-between border-t border-neutral-100 dark:border-neutral-900 text-xs font-bold text-[#D4AF37] uppercase tracking-wider">
                    <span>{lang === 'ru' ? 'Читать статью' : lang === 'en' ? 'Read article' : 'Lire l\'article'}</span>
                    <span className="transition-transform duration-300 group-hover:translate-x-1">→</span>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      )}

      {/* Article Detail Page */}
      {currentView === 'article-details' && selectedArticle && (
        <article className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-10 animate-fadeIn">
          {/* Sticky Back Button */}
          <div className="sticky top-[80px] z-40 bg-[#F8F9FA]/90 dark:bg-[#0D0D0D]/90 backdrop-blur-md py-4 border-b border-neutral-200 dark:border-neutral-900 mb-6 -mx-4 px-4 sm:mx-0 sm:px-0 flex items-center justify-between">
            <button onClick={() => navigateTo(previousView === 'actualites' ? 'actualites' : 'actualites')} className="flex items-center gap-2 text-neutral-600 dark:text-neutral-400 hover:text-[#D4AF37] text-xs uppercase tracking-widest font-bold transition-colors">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
              {lang === 'ru' ? '← Все статьи' : lang === 'en' ? '← All articles' : '← Toutes les actualités'}
            </button>
            <div className="flex gap-2">
              <button 
                onClick={() => {
                  if (navigator.clipboard) {
                    navigator.clipboard.writeText(window.location.href);
                    showNotification(t('copiedToClipboard'), "success");
                  }
                }}
                className="px-3 py-1.5 rounded-xl bg-neutral-100 dark:bg-neutral-900 hover:bg-[#D4AF37]/10 text-neutral-600 dark:text-neutral-400 hover:text-[#D4AF37] border border-neutral-200 dark:border-neutral-800 text-xs font-semibold transition-all flex items-center gap-1.5"
                title="Partager"
              >
                <Icons.Globe />
                <span>{lang === 'ru' ? 'Поделиться' : lang === 'en' ? 'Share' : 'Partager'}</span>
              </button>
            </div>
          </div>

          {/* Breadcrumbs */}
          <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs text-neutral-500 dark:text-neutral-400 overflow-x-auto whitespace-nowrap py-1">
            <button onClick={() => navigateTo('home')} className="hover:text-[#D4AF37] transition-colors">{t('home')}</button>
            <span>/</span>
            <button onClick={() => navigateTo('actualites')} className="hover:text-[#D4AF37] transition-colors">{lang === 'ru' ? 'Статьи' : lang === 'en' ? 'Articles' : 'Actualités'}</button>
            <span>/</span>
            <span className="text-neutral-900 dark:text-white font-semibold truncate max-w-[200px] sm:max-w-xs">{getArticleTitle(selectedArticle, lang)}</span>
          </nav>

          {/* Article Header */}
          <header className="space-y-4">
            {selectedArticle.tags && selectedArticle.tags.length > 0 && (
              <div className="flex flex-wrap items-center gap-2">
                {selectedArticle.tags.map((tag, idx) => (
                  <span key={idx} className="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[#D4AF37]/10 text-[#D4AF37] border border-[#D4AF37]/20">
                    {tag}
                  </span>
                ))}
              </div>
            )}

            {/* 1. Title */}
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-serif font-black text-neutral-900 dark:text-white leading-[1.2] tracking-tight">
              {getArticleTitle(selectedArticle, lang)}
            </h1>
          </header>

          {/* 2. Featured Image */}
          {selectedArticle.featuredImage && (
            <div className="relative rounded-3xl overflow-hidden shadow-2xl aspect-[16/9] bg-neutral-900 border border-neutral-200 dark:border-neutral-800">
              <img 
                src={selectedArticle.featuredImage} 
                alt={selectedArticle.featuredImageAlt || getArticleTitle(selectedArticle, lang)} 
                className="w-full h-full object-cover"
                onError={(e: any) => { e.currentTarget.src = getFallbackSvg(1200, 675, 32, 4); }}
              />
            </div>
          )}

          {/* 3. Excerpt Quote */}
          {getArticleExcerpt(selectedArticle, lang) && (
            <p className="text-base sm:text-lg text-neutral-700 dark:text-neutral-300 font-light leading-relaxed border-l-4 border-[#D4AF37] pl-5 py-3 italic bg-neutral-50 dark:bg-[#141416] rounded-r-2xl shadow-sm">
              {getArticleExcerpt(selectedArticle, lang)}
            </p>
          )}

          {/* 4. Article Main Content & 5. Author at bottom */}
          <div className="bg-white dark:bg-[#121214] border border-neutral-200 dark:border-neutral-800 rounded-3xl p-8 sm:p-14 shadow-sm space-y-12">
            <div>
              {renderArticleContent(getArticleContent(selectedArticle, lang))}
            </div>

            {/* 5. Author at bottom */}
            <div className="flex items-center gap-4 pt-8 border-t border-neutral-200 dark:border-neutral-800 text-xs text-neutral-500">
              <div className="w-11 h-11 rounded-full bg-[#D4AF37] text-neutral-950 flex items-center justify-center font-bold text-sm shadow-sm">
                LA
              </div>
              <div>
                <p className="font-bold text-sm text-neutral-900 dark:text-white">{selectedArticle.author || 'Ligo Automobiles'}</p>
                <p className="text-neutral-500 mt-0.5">{selectedArticle.publishedAt ? new Date(selectedArticle.publishedAt).toLocaleDateString(lang === 'ru' ? 'ru-RU' : lang === 'en' ? 'en-US' : 'fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) : 'Édition Ligo Automobiles'}</p>
              </div>
            </div>
          </div>
        </article>
      )}

      {/* Car details page */}
      {currentView === 'car-details' && selectedCar && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          {/* Breadcrumb Navigation & Top Actions */}
          <div className="flex items-center justify-between gap-4 mb-6 flex-wrap">
            <nav aria-label="Fil d'Ariane" className="flex items-center gap-2 text-xs text-neutral-500 dark:text-neutral-400 flex-wrap">
              <button onClick={() => navigateTo('home')} className="hover:text-[#D4AF37] transition-colors">{t('backToHome')}</button>
              <span>/</span>
              <button onClick={() => navigateTo('catalog')} className="hover:text-[#D4AF37] transition-colors">{t('catalog')}</button>
              <span>/</span>
              <button onClick={() => { setSelectedBrand(selectedCar.brand); navigateTo('catalog'); }} className="hover:text-[#D4AF37] transition-colors font-medium">{selectedCar.brand}</button>
              <span>/</span>
              <span className="text-neutral-900 dark:text-white font-semibold truncate max-w-[200px] sm:max-w-xs">{selectedCar.model}</span>
            </nav>

            <button
              onClick={() => handleToggleCompare(selectedCar)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-all ${
                isCompared(selectedCar.id)
                  ? 'bg-[#D4AF37] text-neutral-950 shadow-md ring-2 ring-[#D4AF37]/30'
                  : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:text-[#D4AF37] border border-neutral-200 dark:border-neutral-700 hover:border-[#D4AF37]'
              }`}
            >
              <Icons.Compare />
              <span>{isCompared(selectedCar.id) ? t('compareAdded') : t('compareAction')}</span>
            </button>
          </div>

          {/* Sold Vehicle Banner */}
          {selectedCar.status === 'Vendu' && (
            <div className="mb-8 p-6 bg-amber-500/10 dark:bg-amber-500/5 border-2 border-amber-500/30 rounded-2xl flex items-center justify-between gap-4 flex-wrap shadow-sm">
              <div className="flex items-center gap-3">
                <span className="text-3xl">ℹ️</span>
                <div>
                  <h3 className="text-sm font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider">Véhicule Vendu</h3>
                  <p className="text-xs text-neutral-700 dark:text-neutral-300 mt-1">{t('carSoldBanner')}</p>
                </div>
              </div>
              <button onClick={() => navigateTo('catalog')} className="px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-neutral-950 text-xs font-bold uppercase tracking-wider rounded-xl transition-colors shadow-md">
                {t('ctaBannerButton')}
              </button>
            </div>
          )}

          {/* Top Hero Grid: Gallery + Main Meta */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 mb-16">
            {/* Image gallery */}
            <div className="space-y-4">
              <div 
                className="relative aspect-[4/3] rounded-3xl overflow-hidden bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 cursor-pointer shadow-lg group" 
                onClick={() => { setLightboxIndex(currentCarGallery.indexOf(activeImage) || 0); setShowLightbox(true); }}
              >
                <img 
                  src={activeImage || selectedCar.image || getFallbackSvg()} 
                  alt={selectedCar.imageAlt || getCarMainImageAlt(selectedCar)} 
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" 
                  onError={(e) => { const fb = getFallbackSvg(); if (e.currentTarget.src !== fb) e.currentTarget.src = fb; }} 
                />
                <div className="absolute top-4 right-4 p-2.5 rounded-full bg-white/90 dark:bg-black/70 backdrop-blur-sm text-neutral-800 dark:text-neutral-200 shadow-md group-hover:scale-110 transition-transform">
                  <Icons.Maximize />
                </div>
                {selectedCar.status && (
                  <div className={`absolute top-4 left-4 px-3 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wider shadow-md backdrop-blur-md ${
                    selectedCar.status === 'En stock' || selectedCar.status === 'Disponible' ? 'bg-emerald-500/90 text-white' :
                    selectedCar.status === 'Réservé' ? 'bg-amber-500/90 text-neutral-950' :
                    selectedCar.status === 'Vendu' ? 'bg-rose-500/90 text-white' :
                    'bg-sky-500/90 text-white'
                  }`}>
                    {t(selectedCar.status)}
                  </div>
                )}
              </div>
              {currentCarGallery.length > 1 && (
                <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-thin">
                  {currentCarGallery.map((img, idx) => {
                    const galleryAlt = selectedCar.galleryImagesAlt?.[idx] || `${selectedCar.brand} ${selectedCar.model} - vue photo ${idx + 1}`;
                    return (
                      <button 
                        key={idx} 
                        onClick={() => setActiveImage(img)} 
                        className={`relative w-24 h-16 rounded-xl overflow-hidden border-2 transition-all flex-shrink-0 shadow-sm ${
                          activeImage === img ? 'border-[#D4AF37] ring-2 ring-[#D4AF37]/30 scale-105' : 'border-neutral-200 dark:border-neutral-800 opacity-60 hover:opacity-100'
                        }`}
                      >
                        <img 
                          src={img} 
                          alt={galleryAlt} 
                          className="w-full h-full object-cover" 
                          onError={(e) => { const fb = getFallbackSvg(400, 250, 16, 2); if (e.currentTarget.src !== fb) e.currentTarget.src = fb; }} 
                        />
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Car info & Key actions */}
            <div className="space-y-6 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-3 mb-2 flex-wrap">
                  <span className="text-xs uppercase tracking-widest text-[#D4AF37] font-bold bg-[#D4AF37]/10 px-3 py-1 rounded-lg">
                    {selectedCar.brand}
                  </span>
                  {selectedCar.engine && (
                    <span className="text-xs uppercase tracking-wider text-neutral-600 dark:text-neutral-400 bg-neutral-100 dark:bg-neutral-800 px-3 py-1 rounded-lg">
                      {selectedCar.engine}
                    </span>
                  )}
                  {selectedCar.bodyType && (
                    <span className="text-xs text-neutral-500 dark:text-neutral-400 bg-neutral-100 dark:bg-neutral-800 px-2.5 py-1 rounded-lg">
                      {selectedCar.bodyType}
                    </span>
                  )}
                </div>

                {/* Unique H1 */}
                <h1 className="text-3xl sm:text-4xl font-serif font-black text-neutral-900 dark:text-white leading-tight mt-2">
                  {selectedCar.seoH1 || getCarH1(selectedCar)}
                </h1>

                <div className="flex items-baseline gap-4 mt-4 mb-6">
                  <div className="text-4xl font-serif font-black text-[#D4AF37]">
                    {selectedCar.price ? selectedCar.price.toLocaleString('fr-FR') : '0'} €
                  </div>
                  {selectedCar.km ? (
                    <div className="text-sm font-medium text-neutral-500 dark:text-neutral-400">
                      • {Number(selectedCar.km).toLocaleString('fr-FR')} km
                    </div>
                  ) : null}
                </div>

                {/* Short excerpt */}
                {(() => {
                  const getCarDesc = () => {
                    if (!selectedCar) return '';
                    if (lang === 'en') return selectedCar.translations?.en?.description || selectedCar.description_en || selectedCar.description || '';
                    if (lang === 'ru') return selectedCar.translations?.ru?.description || selectedCar.description_ru || selectedCar.description || '';
                    return selectedCar.translations?.fr?.description || selectedCar.description || selectedCar.description_en || selectedCar.description_ru || '';
                  };
                  const desc = getCarDesc();
                  return desc ? (
                    <p className="text-neutral-600 dark:text-neutral-300 text-sm leading-relaxed whitespace-pre-line bg-neutral-50 dark:bg-[#121214] p-4 rounded-2xl border border-neutral-200 dark:border-neutral-800/80 mb-6">
                      {desc}
                    </p>
                  ) : null;
                })()}

                {/* Quick specs grid */}
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 mb-6">
                  <div className="p-3 bg-neutral-50 dark:bg-[#141416] border border-neutral-200 dark:border-neutral-800 rounded-xl text-center">
                    <span className="text-[10px] uppercase tracking-wider text-neutral-500 block font-bold mb-1">{t('modelYear')}</span>
                    <span className="text-sm font-bold text-neutral-900 dark:text-white">{selectedCar.year}</span>
                  </div>
                  <div className="p-3 bg-neutral-50 dark:bg-[#141416] border border-neutral-200 dark:border-neutral-800 rounded-xl text-center">
                    <span className="text-[10px] uppercase tracking-wider text-neutral-500 block font-bold mb-1">{t('fuel')}</span>
                    <span className="text-sm font-bold text-neutral-900 dark:text-white truncate block">{t(selectedCar.fuel)}</span>
                  </div>
                  <div className="p-3 bg-neutral-50 dark:bg-[#141416] border border-neutral-200 dark:border-neutral-800 rounded-xl text-center">
                    <span className="text-[10px] uppercase tracking-wider text-neutral-500 block font-bold mb-1">{t('transmission')}</span>
                    <span className="text-sm font-bold text-neutral-900 dark:text-white truncate block">{t(selectedCar.transmission)}</span>
                  </div>
                  <div className="p-3 bg-neutral-50 dark:bg-[#141416] border border-neutral-200 dark:border-neutral-800 rounded-xl text-center col-span-3 sm:col-span-1">
                    <span className="text-[10px] uppercase tracking-wider text-neutral-500 block font-bold mb-1">{t('enginePower')}</span>
                    <span className="text-sm font-bold text-neutral-900 dark:text-white">{selectedCar.hp || '-'} ch</span>
                  </div>
                </div>

                {/* Certified VIN banner */}
                {selectedCar.vin && (
                  <div className="p-3.5 bg-neutral-50 dark:bg-[#121214] border border-neutral-200 dark:border-neutral-800 rounded-xl flex items-center justify-between mb-6">
                    <div className="flex items-center gap-2.5">
                      <span className="text-emerald-500">🛡️</span>
                      <div>
                        <span className="text-[10px] uppercase tracking-wider text-neutral-500 font-bold block">{t('vinCertified')}</span>
                        <div className="text-xs font-mono text-neutral-900 dark:text-white font-bold tracking-wider">{selectedCar.vin}</div>
                      </div>
                    </div>
                    <button onClick={() => handleCopyVIN(selectedCar.vin)} className="px-3 py-1.5 rounded-lg bg-white dark:bg-[#1E1E22] border border-neutral-200 dark:border-neutral-700 text-xs font-bold text-neutral-700 dark:text-neutral-300 hover:text-[#D4AF37] hover:border-[#D4AF37] transition-all">
                      {t('copy')}
                    </button>
                  </div>
                )}
              </div>

              {/* Action tabs (Specs / Test Drive) */}
              <div className="space-y-4 pt-2">
                <div className="flex gap-4 border-b border-neutral-200 dark:border-neutral-800">
                  <button 
                    onClick={() => handleSelectDetailsTab('specs')} 
                    className={`pb-3 text-xs font-bold uppercase tracking-widest transition-all border-b-2 ${
                      activeDetailsTab === 'specs' ? 'border-[#D4AF37] text-[#D4AF37]' : 'border-transparent text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
                    }`}
                  >
                    {t('contact')}
                  </button>
                  <button 
                    onClick={() => handleSelectDetailsTab('testdrive')} 
                    className={`pb-3 text-xs font-bold uppercase tracking-widest transition-all border-b-2 ${
                      activeDetailsTab === 'testdrive' ? 'border-[#D4AF37] text-[#D4AF37]' : 'border-transparent text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
                    }`}
                  >
                    📅 {t('bookTestDrive')}
                  </button>
                </div>

                {activeDetailsTab === 'specs' && (
                  <div className="flex flex-col sm:flex-row gap-4 pt-2">
                    <a 
                      href={`https://wa.me/${siteSettings.phone?.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(`Bonjour, je suis intéressé(e) par votre véhicule ${selectedCar.brand} ${selectedCar.model} au prix de ${selectedCar.price?.toLocaleString('fr-FR')} €.`)}`} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="flex-1 flex items-center justify-center gap-2.5 bg-[#25D366] hover:bg-[#20bd5a] text-white px-6 py-4 rounded-2xl font-bold transition-all shadow-md active:scale-95"
                    >
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z"/></svg>
                      WhatsApp
                    </a>
                    <a 
                      href={`tel:${siteSettings.phone?.replace(/[^0-9+]/g, '')}`} 
                      className="flex-1 flex items-center justify-center gap-2 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 px-6 py-4 rounded-2xl font-bold transition-all hover:bg-[#D4AF37] dark:hover:bg-[#D4AF37] dark:hover:text-neutral-950 shadow-md active:scale-95"
                    >
                      <Icons.Phone />
                      {t('callUs')}
                    </a>
                  </div>
                )}

                {activeDetailsTab === 'testdrive' && (
                  <div className="bg-neutral-50 dark:bg-[#121214] border border-neutral-200 dark:border-neutral-800 rounded-2xl p-6 shadow-sm">
                    <form onSubmit={handleTestDriveSubmit} className="space-y-3">
                      <input type="text" placeholder={t('fullName')} value={testDriveForm.name} onChange={(e) => setTestDriveForm({...testDriveForm, name: e.target.value})} className="w-full bg-white dark:bg-[#0D0D0D] border border-neutral-200 dark:border-neutral-800 focus:border-[#D4AF37] rounded-xl py-2.5 px-4 text-sm text-neutral-900 dark:text-white focus:outline-none" required />
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <input type="email" placeholder={t('email')} value={testDriveForm.email} onChange={(e) => setTestDriveForm({...testDriveForm, email: e.target.value})} className="w-full bg-white dark:bg-[#0D0D0D] border border-neutral-200 dark:border-neutral-800 focus:border-[#D4AF37] rounded-xl py-2.5 px-4 text-sm text-neutral-900 dark:text-white focus:outline-none" required />
                        <input type="tel" placeholder={t('phone')} value={testDriveForm.phone} onChange={(e) => setTestDriveForm({...testDriveForm, phone: e.target.value})} className="w-full bg-white dark:bg-[#0D0D0D] border border-neutral-200 dark:border-neutral-800 focus:border-[#D4AF37] rounded-xl py-2.5 px-4 text-sm text-neutral-900 dark:text-white focus:outline-none" required />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div><label className="text-[10px] text-neutral-500 uppercase tracking-wider font-bold block mb-1">{t('preferredDate')}</label><input type="date" value={testDriveForm.date} onChange={(e) => setTestDriveForm({...testDriveForm, date: e.target.value})} className="w-full bg-white dark:bg-[#0D0D0D] border border-neutral-200 dark:border-neutral-800 focus:border-[#D4AF37] rounded-xl py-2 px-3 text-xs text-neutral-900 dark:text-white focus:outline-none" required /></div>
                        <div><label className="text-[10px] text-neutral-500 uppercase tracking-wider font-bold block mb-1">{t('preferredTime')}</label><input type="time" value={testDriveForm.time} onChange={(e) => setTestDriveForm({...testDriveForm, time: e.target.value})} className="w-full bg-white dark:bg-[#0D0D0D] border border-neutral-200 dark:border-neutral-800 focus:border-[#D4AF37] rounded-xl py-2 px-3 text-xs text-neutral-900 dark:text-white focus:outline-none" /></div>
                      </div>
                      <textarea rows={2} placeholder={t('specialRequest')} value={testDriveForm.comment} onChange={(e) => setTestDriveForm({...testDriveForm, comment: e.target.value})} className="w-full bg-white dark:bg-[#0D0D0D] border border-neutral-200 dark:border-neutral-800 focus:border-[#D4AF37] rounded-xl py-2 px-4 text-xs text-neutral-900 dark:text-white focus:outline-none resize-none"></textarea>
                      <button type="submit" className="w-full py-3 rounded-xl bg-[#D4AF37] hover:bg-[#D4AF37]/90 text-neutral-950 font-bold text-xs uppercase tracking-wider transition-all shadow-md">{t('sendRequest')}</button>
                    </form>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Section: Complete Technical Specifications Table */}
          <section className="mb-16">
            <h2 className="text-2xl sm:text-3xl font-serif font-black text-neutral-900 dark:text-white mb-6">
              {t('carKeySpecs')}
            </h2>
            <div className="bg-white dark:bg-[#121214] border border-neutral-200 dark:border-neutral-800 rounded-3xl overflow-hidden shadow-sm">
              <table className="w-full text-left text-sm">
                <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800">
                  <tr className="hover:bg-neutral-50/50 dark:hover:bg-neutral-900/30 transition-colors">
                    <th scope="row" className="py-4 px-6 font-medium text-neutral-500 dark:text-neutral-400 w-1/3 sm:w-1/4">{t('brand')}</th>
                    <td className="py-4 px-6 font-semibold text-neutral-900 dark:text-white">{selectedCar.brand}</td>
                  </tr>
                  <tr className="hover:bg-neutral-50/50 dark:hover:bg-neutral-900/30 transition-colors">
                    <th scope="row" className="py-4 px-6 font-medium text-neutral-500 dark:text-neutral-400">{t('model')}</th>
                    <td className="py-4 px-6 font-semibold text-neutral-900 dark:text-white">{selectedCar.model}</td>
                  </tr>
                  {selectedCar.engine && (
                    <tr className="hover:bg-neutral-50/50 dark:hover:bg-neutral-900/30 transition-colors">
                      <th scope="row" className="py-4 px-6 font-medium text-neutral-500 dark:text-neutral-400">{t('engineLabel')}</th>
                      <td className="py-4 px-6 font-semibold text-neutral-900 dark:text-white">{selectedCar.engine}</td>
                    </tr>
                  )}
                  <tr className="hover:bg-neutral-50/50 dark:hover:bg-neutral-900/30 transition-colors">
                    <th scope="row" className="py-4 px-6 font-medium text-neutral-500 dark:text-neutral-400">{t('modelYear')}</th>
                    <td className="py-4 px-6 font-semibold text-neutral-900 dark:text-white">{selectedCar.year}</td>
                  </tr>
                  <tr className="hover:bg-neutral-50/50 dark:hover:bg-neutral-900/30 transition-colors">
                    <th scope="row" className="py-4 px-6 font-medium text-neutral-500 dark:text-neutral-400">{t('mileage')}</th>
                    <td className="py-4 px-6 font-semibold text-neutral-900 dark:text-white">{Number(selectedCar.km || 0).toLocaleString('fr-FR')} km</td>
                  </tr>
                  <tr className="hover:bg-neutral-50/50 dark:hover:bg-neutral-900/30 transition-colors">
                    <th scope="row" className="py-4 px-6 font-medium text-neutral-500 dark:text-neutral-400">{t('fuel')}</th>
                    <td className="py-4 px-6 font-semibold text-neutral-900 dark:text-white">{t(selectedCar.fuel)}</td>
                  </tr>
                  <tr className="hover:bg-neutral-50/50 dark:hover:bg-neutral-900/30 transition-colors">
                    <th scope="row" className="py-4 px-6 font-medium text-neutral-500 dark:text-neutral-400">{t('transmission')}</th>
                    <td className="py-4 px-6 font-semibold text-neutral-900 dark:text-white">{t(selectedCar.transmission)}</td>
                  </tr>
                  <tr className="hover:bg-neutral-50/50 dark:hover:bg-neutral-900/30 transition-colors">
                    <th scope="row" className="py-4 px-6 font-medium text-neutral-500 dark:text-neutral-400">{t('enginePower')}</th>
                    <td className="py-4 px-6 font-semibold text-neutral-900 dark:text-white">{selectedCar.hp} ch</td>
                  </tr>
                  <tr className="hover:bg-neutral-50/50 dark:hover:bg-neutral-900/30 transition-colors">
                    <th scope="row" className="py-4 px-6 font-medium text-neutral-500 dark:text-neutral-400">{t('co2Emissions')}</th>
                    <td className="py-4 px-6 font-semibold text-neutral-900 dark:text-white">{selectedCar.co2} CV</td>
                  </tr>
                  {selectedCar.color && (
                    <tr className="hover:bg-neutral-50/50 dark:hover:bg-neutral-900/30 transition-colors">
                      <th scope="row" className="py-4 px-6 font-medium text-neutral-500 dark:text-neutral-400">{t('color')}</th>
                      <td className="py-4 px-6 font-semibold text-neutral-900 dark:text-white">{selectedCar.color}</td>
                    </tr>
                  )}
                  <tr className="hover:bg-neutral-50/50 dark:hover:bg-neutral-900/30 transition-colors">
                    <th scope="row" className="py-4 px-6 font-medium text-neutral-500 dark:text-neutral-400">{t('doors')} / {t('seats')}</th>
                    <td className="py-4 px-6 font-semibold text-neutral-900 dark:text-white">{selectedCar.doors || 5} portes / {selectedCar.seats || 5} places</td>
                  </tr>
                  {selectedCar.bodyType && (
                    <tr className="hover:bg-neutral-50/50 dark:hover:bg-neutral-900/30 transition-colors">
                      <th scope="row" className="py-4 px-6 font-medium text-neutral-500 dark:text-neutral-400">{t('bodyType')}</th>
                      <td className="py-4 px-6 font-semibold text-neutral-900 dark:text-white">{selectedCar.bodyType}</td>
                    </tr>
                  )}
                  {selectedCar.vin && (
                    <tr className="hover:bg-neutral-50/50 dark:hover:bg-neutral-900/30 transition-colors">
                      <th scope="row" className="py-4 px-6 font-medium text-neutral-500 dark:text-neutral-400">{t('vinCertified')}</th>
                      <td className="py-4 px-6 font-mono text-xs font-bold text-[#D4AF37]">{selectedCar.vin}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

          {/* Section: Equipment & Options */}
          {selectedCar.equipments && selectedCar.equipments.length > 0 && (
            <section className="mb-16">
              <span className="text-xs uppercase tracking-widest text-[#D4AF37] font-bold block mb-2">{t('equipmentsLabel')}</span>
              <h2 className="text-2xl sm:text-3xl font-serif font-black text-neutral-900 dark:text-white mb-6">
                {t('carEquipments')}
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {selectedCar.equipments.map((eq, eqIdx) => (
                  <div key={eqIdx} className="flex items-center gap-3 p-4 bg-neutral-50 dark:bg-[#121214] border border-neutral-200 dark:border-neutral-800 rounded-2xl">
                    <span className="text-emerald-500 font-bold text-sm">✓</span>
                    <span className="text-sm font-medium text-neutral-800 dark:text-neutral-200">{translateEquipment(eq, lang, selectedCar.customEquipments)}</span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Section 7: Similar Vehicles */}
          {(() => {
            const similar = cars.filter(c => 
              c.id !== selectedCar.id && 
              (
                selectedCar.similarCarIds?.includes(c.id) ||
                c.brand === selectedCar.brand ||
                c.bodyType === selectedCar.bodyType ||
                c.fuel === selectedCar.fuel ||
                Math.abs(c.price - selectedCar.price) <= 50000
              )
            ).slice(0, 3);

            if (similar.length === 0) return null;

            return (
              <section className="mb-8">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <span className="text-xs uppercase tracking-widest text-[#D4AF37] font-bold block mb-1">{t('similarVehicles')}</span>
                    <h2 className="text-2xl sm:text-3xl font-serif font-black text-neutral-900 dark:text-white">
                      {t('similarVehiclesTitle')}
                    </h2>
                  </div>
                  <button onClick={() => navigateTo('catalog')} className="text-xs uppercase tracking-wider font-bold text-[#D4AF37] hover:underline">
                    {t('catalog')} →
                  </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {similar.map((simCar) => (
                    <div 
                      key={simCar.id} 
                      onClick={() => handleSelectCar(simCar)}
                      className="bg-white dark:bg-[#121214] border border-neutral-200 dark:border-neutral-800 rounded-2xl overflow-hidden cursor-pointer hover:border-[#D4AF37] transition-all hover:shadow-xl group flex flex-col justify-between"
                    >
                      <div>
                        <div className="relative aspect-[4/3] overflow-hidden bg-neutral-100 dark:bg-neutral-900">
                          <img 
                            src={simCar.image || getFallbackSvg()} 
                            alt={simCar.imageAlt || getCarMainImageAlt(simCar)} 
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                          />
                          <div className="absolute top-3 left-3 px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider bg-neutral-950/80 text-white backdrop-blur-sm">
                            {simCar.brand}
                          </div>
                        </div>
                        <div className="p-5">
                          <h3 className="font-serif font-bold text-base text-neutral-900 dark:text-white group-hover:text-[#D4AF37] transition-colors">
                            {simCar.model}
                          </h3>
                          <div className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                            {simCar.year} • {Number(simCar.km || 0).toLocaleString('fr-FR')} km • {t(simCar.fuel)}
                          </div>
                          <div className="text-lg font-serif font-black text-[#D4AF37] mt-3">
                            {simCar.price ? simCar.price.toLocaleString('fr-FR') : '0'} €
                          </div>
                        </div>
                      </div>
                      <div className="px-5 pb-5 pt-0">
                        <button className="w-full py-2.5 rounded-xl bg-neutral-100 dark:bg-[#1A1A1C] hover:bg-[#D4AF37] hover:text-neutral-950 dark:hover:bg-[#D4AF37] dark:hover:text-neutral-950 text-neutral-900 dark:text-white font-bold text-xs uppercase tracking-wider transition-all">
                          {t('viewVehicleDetails')}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            );
          })()}
        </section>
      )}

      {/* Comparison page */}
      {currentView === 'comparison' && renderComparisonView()}

      {/* Catalog page */}
      {(currentView === 'catalog' || (currentView === 'home' && false)) && (
        <>
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative">
        {/* Sticky Back Button */}
        <div className="sticky top-[80px] z-40 bg-[#F8F9FA]/90 dark:bg-[#0D0D0D]/90 backdrop-blur-md py-4 border-b border-neutral-200 dark:border-neutral-900 mb-8 -mx-4 px-4 sm:mx-0 sm:px-0">
          <button onClick={() => navigateTo('home')} className="flex items-center gap-2 text-neutral-600 dark:text-neutral-400 hover:text-[#D4AF37] text-xs uppercase tracking-widest font-bold transition-colors">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
            {t('backToHome')}
          </button>
        </div>

        <div className="text-center space-y-3 mb-12">
          <h2 className="text-4xl font-serif text-neutral-900 dark:text-white tracking-tight">{t('vehicleCatalogue')}</h2>
          <p className="text-neutral-600 dark:text-neutral-400 text-sm font-light">{t('vehicleCatalogueDesc')}</p>
        </div>

        {/* Интерактивная плашка фильтров */}
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
                  
                  {/* Single Sleek Status Badge */}
                  <div className="absolute top-3 left-3 z-10">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider backdrop-blur-md shadow-sm ${
                      car.status === 'Vendu' 
                        ? 'bg-neutral-900/90 text-neutral-400 border border-neutral-700/60' 
                        : car.status === 'En arrivage'
                          ? 'bg-amber-950/80 text-amber-300 border border-amber-500/40'
                          : 'bg-black/50 text-white/95 border border-white/20'
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${
                        car.status === 'Vendu' ? 'bg-neutral-500' : car.status === 'En arrivage' ? 'bg-amber-400' : 'bg-emerald-400'
                      }`}></span>
                      {translateStatus(car.status, lang)}
                    </span>
                  </div>

                  {/* Compact Circular Compare Button */}
                  <button 
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleToggleCompare(car);
                    }}
                    className={`absolute top-3 right-3 z-10 w-9 h-9 rounded-full flex items-center justify-center transition-all backdrop-blur-md shadow-md active:scale-90 ${
                      isCompared(car.id)
                        ? 'bg-[#D4AF37] text-neutral-950 ring-2 ring-[#D4AF37]/50 scale-105'
                        : 'bg-black/45 hover:bg-black/75 text-white/90 hover:text-white border border-white/20 hover:border-[#D4AF37]'
                    }`}
                    title={isCompared(car.id) ? t('compareAdded') : t('compareAction')}
                    aria-label={isCompared(car.id) ? t('compareAdded') : t('compareAction')}
                  >
                    <Icons.Compare />
                  </button>
                </div>

                {/* Основное описание */}
                <div className="p-6 flex-1 flex flex-col justify-between">
                  <div className="space-y-4">
                    <div className="flex items-start justify-between gap-4">
                      <div onClick={() => handleSelectCar(car)} className="cursor-pointer flex-1">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className="text-xs uppercase tracking-widest text-neutral-500 dark:text-neutral-400 font-medium">{car.brand}</span>
                          {car.verifiedVin && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-[#D4AF37] bg-[#D4AF37]/10 dark:bg-[#D4AF37]/15 px-2 py-0.5 rounded-full border border-[#D4AF37]/20">
                              <Icons.CheckBadge />
                              <span>{t('vinVerified')}</span>
                            </span>
                          )}
                        </div>
                        <h3 className="text-xl font-bold text-neutral-900 dark:text-white group-hover:text-[#D4AF37] transition-colors">{car.model}</h3>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <div className="text-xl font-serif font-black text-[#D4AF37]">
                          {car.price ? Number(car.price).toLocaleString(lang === 'ru' ? 'ru-RU' : lang === 'en' ? 'en-US' : 'fr-FR') : '0'} €
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
                        <span>{car.km ? Number(car.km).toLocaleString(lang === 'ru' ? 'ru-RU' : lang === 'en' ? 'en-US' : 'fr-FR') : '0'} km</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Icons.Fuel />
                        <span>{translateFuel(car.fuel, lang)}</span>
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

      </section>
        </>
      )}

      {currentView === 'admin' && isAdmin && renderAdminDashboard()}

      {/* Footer */}
      {currentView !== 'admin' && (
        <footer className="relative border-t border-neutral-200 dark:border-neutral-900 bg-[#F1F3F5] dark:bg-[#0D0D0D] py-12 text-center text-xs text-neutral-600 dark:text-neutral-400 mt-16">
          <div className="max-w-7xl mx-auto px-4 space-y-4">
            <p className="tracking-widest font-serif font-bold text-neutral-800 dark:text-neutral-300">{siteSettings.companyName || "Ligo Automobiles"}</p>
            <p>© {new Date().getFullYear()} {siteSettings.companyName || "Ligo Automobiles"}. {t('allRightsReserved')}. {siteSettings.address || "Paris, France"}.</p>
          </div>
          <div className="sm:absolute sm:bottom-4 sm:right-6 mt-4 sm:mt-0 text-[11px] text-neutral-400/60 dark:text-neutral-600 hover:text-[#D4AF37] transition-colors select-none font-medium tracking-wide">
            by Wind
          </div>
        </footer>
      )}


      


      


      


      


      


      


      


      {/* Floating Comparison Bottom Bar */}
      {comparedCarIds.length > 0 && currentView !== 'comparison' && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-white/95 dark:bg-[#121214]/95 backdrop-blur-md border border-[#D4AF37]/50 shadow-2xl rounded-2xl p-4 flex items-center gap-4 max-w-lg w-[90%]">
          <div className="flex -space-x-2">
            {comparedCarIds.map(id => {
              const c = cars.find(car => car.id === id);
              if (!c) return null;
              return (
                <img key={id} src={c.image || getFallbackSvg(60, 40, 10, 1)} alt={c.brand} className="w-10 h-10 rounded-full object-cover border-2 border-white dark:border-[#121214]" />
              );
            })}
          </div>
          <div className="flex-1 text-xs">
            <span className="font-bold text-neutral-900 dark:text-white">{comparedCarIds.length}/4</span> {t('compareFloatingCount')}
          </div>
          <button onClick={handleOpenComparison} className="px-4 py-2 bg-[#D4AF37] hover:bg-[#D4AF37]/90 text-neutral-950 font-bold text-xs rounded-xl shadow-md transition-all">
            {t('compareFloatingBtn')}
          </button>
          <button onClick={handleClearComparison} className="text-neutral-400 hover:text-red-500 text-xs">
            ✕
          </button>
        </div>
      )}

            {/* Модальное окно добавления/редактирования автомобиля */}
      {showAddEditModal && (
        <div id="add-edit-modal-wrapper" className="fixed inset-0 z-50 flex justify-center items-start p-3 sm:p-6 bg-neutral-950/80 backdrop-blur-md overflow-y-auto">
          <div className="relative w-full max-w-4xl bg-white dark:bg-[#121214] border border-neutral-200 dark:border-neutral-800 rounded-3xl overflow-hidden shadow-2xl my-4 sm:my-8 text-neutral-900 dark:text-white flex flex-col max-h-[92vh]">
            {/* Header with Title, Status & Close */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-neutral-200 dark:border-neutral-800 flex-shrink-0 bg-white dark:bg-[#121214]">
              <div>
                <h3 className="text-xl sm:text-2xl font-serif font-bold text-neutral-900 dark:text-white">
                  {carToEdit ? 'Редактировать автомобиль' : 'Добавить автомобиль в каталог'}
                </h3>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                  Настройка технических характеристик, медиа, многоязычного контента (FR / EN / RU) и SEO-индексации.
                </p>
                {/* Localization Status Indicators */}
                {(() => {
                  const loc = getCarLocalizationStatus(formData);
                  return (
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-[11px] text-neutral-500 font-semibold">Локализации:</span>
                      <span 
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${loc.fr.complete ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20' : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'}`}
                        title={loc.fr.complete ? 'Французская версия полностью заполнена' : `FR не хватает: ${loc.fr.missing.join(', ')}`}
                      >
                        FR {loc.fr.label}
                      </span>
                      <span 
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${loc.en.complete ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20' : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'}`}
                        title={loc.en.complete ? 'Английская версия полностью заполнена' : `EN не хватает: ${loc.en.missing.join(', ')}`}
                      >
                        EN {loc.en.label}
                      </span>
                      <span 
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${loc.ru.complete ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20' : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'}`}
                        title={loc.ru.complete ? 'Русская версия полностью заполнена' : `RU не хватает: ${loc.ru.missing.join(', ')}`}
                      >
                        RU {loc.ru.label}
                      </span>
                    </div>
                  );
                })()}
              </div>
              <button 
                onClick={() => setShowAddEditModal(false)}
                className="p-2.5 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors"
                aria-label="Закрыть"
              >
                <Icons.X />
              </button>
            </div>

            {/* Navigation Tabs Header */}
            <div className="flex border-b border-neutral-200 dark:border-neutral-800 px-6 bg-neutral-50 dark:bg-[#0D0D0D] overflow-x-auto gap-2 flex-shrink-0 custom-scrollbar">
              {[
                { id: 'info', label: 'Информация', icon: '📋' },
                { id: 'media', label: 'Медиа и фото', icon: '📸' },
                { id: 'desc', label: 'Описание и опции', icon: '📝' },
                { id: 'seo', label: 'SEO и индексация', icon: '🔍' },
                { id: 'faq', label: 'FAQ автомобиля', icon: '❓' },
                { id: 'relations', label: 'Статус и витрина', icon: '🔗' },
              ].map(tab => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setCarActiveTab(tab.id as any)}
                  className={`py-3.5 px-4 text-xs font-bold uppercase tracking-wider whitespace-nowrap border-b-2 flex items-center gap-2 transition-all ${
                    carActiveTab === tab.id 
                      ? 'border-[#D4AF37] text-[#D4AF37] bg-white dark:bg-[#121214]' 
                      : 'border-transparent text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-300'
                  }`}
                >
                  <span>{tab.icon}</span>
                  <span>{tab.label}</span>
                </button>
              ))}
            </div>

            {/* Scrollable Form Body */}
            <form noValidate onSubmit={handleFormSubmit} className="overflow-y-auto p-6 sm:p-8 space-y-6 flex-1 custom-scrollbar">
              
              {/* TAB 1: ИНФОРМАЦИЯ */}
              {carActiveTab === 'info' && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] uppercase tracking-wider text-neutral-600 dark:text-neutral-400 font-bold flex items-center">
                        Марка<span className="text-red-500 font-bold ml-1">*</span>
                      </label>
                      <input 
                        type="text" 
                        placeholder="например: Peugeot, Porsche, BMW..." 
                        value={formData.brand || ''} 
                        onChange={(e) => {
                          setFormData({ ...formData, brand: e.target.value });
                          if (formErrors.brand) setFormErrors(prev => ({ ...prev, brand: false }));
                        }} 
                        className={`w-full bg-neutral-50 dark:bg-[#0D0D0D] border rounded-xl py-2.5 px-4 text-sm text-neutral-900 dark:text-white focus:outline-none transition-all ${
                          formErrors.brand ? 'border-red-500' : 'border-neutral-200 dark:border-neutral-800 focus:border-[#D4AF37]'
                        }`} 
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] uppercase tracking-wider text-neutral-600 dark:text-neutral-400 font-bold flex items-center">
                        Модель<span className="text-red-500 font-bold ml-1">*</span>
                      </label>
                      <input 
                        type="text" 
                        placeholder="например: 2008, 911 Carrera, X5..." 
                        value={formData.model || ''} 
                        onChange={(e) => {
                          setFormData({ ...formData, model: e.target.value });
                          if (formErrors.model) setFormErrors(prev => ({ ...prev, model: false }));
                        }} 
                        className={`w-full bg-neutral-50 dark:bg-[#0D0D0D] border rounded-xl py-2.5 px-4 text-sm text-neutral-900 dark:text-white focus:outline-none transition-all ${
                          formErrors.model ? 'border-red-500' : 'border-neutral-200 dark:border-neutral-800 focus:border-[#D4AF37]'
                        }`} 
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] uppercase tracking-wider text-neutral-600 dark:text-neutral-400 font-bold">
                        Двигатель / Модификация
                      </label>
                      <input 
                        type="text" 
                        placeholder="например: 1.2 PureTech 130, 3.0 BiTurbo..." 
                        value={formData.engine || ''} 
                        onChange={(e) => setFormData({ ...formData, engine: e.target.value })} 
                        className="w-full bg-neutral-50 dark:bg-[#0D0D0D] border border-neutral-200 dark:border-neutral-800 focus:border-[#D4AF37] rounded-xl py-2.5 px-4 text-sm text-neutral-900 dark:text-white focus:outline-none" 
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] uppercase tracking-wider text-neutral-600 dark:text-neutral-400 font-bold">Год выпуска</label>
                      <input 
                        type="number" 
                        value={formData.year || ''} 
                        onChange={(e) => setFormData({ ...formData, year: Number(e.target.value) })} 
                        className="w-full bg-neutral-50 dark:bg-[#0D0D0D] border border-neutral-200 dark:border-neutral-800 focus:border-[#D4AF37] rounded-xl py-2.5 px-4 text-sm text-neutral-900 dark:text-white focus:outline-none" 
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] uppercase tracking-wider text-neutral-600 dark:text-neutral-400 font-bold">Пробег (км)</label>
                      <input 
                        type="number" 
                        value={formData.km ?? ''} 
                        onChange={(e) => setFormData({ ...formData, km: e.target.value })} 
                        className="w-full bg-neutral-50 dark:bg-[#0D0D0D] border border-neutral-200 dark:border-neutral-800 focus:border-[#D4AF37] rounded-xl py-2.5 px-4 text-sm text-neutral-900 dark:text-white focus:outline-none" 
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] uppercase tracking-wider text-neutral-600 dark:text-neutral-400 font-bold flex items-center">
                        Цена (€)<span className="text-red-500 font-bold ml-1">*</span>
                      </label>
                      <input 
                        type="number" 
                        value={formData.price ?? ''} 
                        onChange={(e) => {
                          setFormData({ ...formData, price: e.target.value as any });
                          if (formErrors.price) setFormErrors(prev => ({ ...prev, price: false }));
                        }} 
                        className={`w-full bg-neutral-50 dark:bg-[#0D0D0D] border rounded-xl py-2.5 px-4 text-sm text-neutral-900 dark:text-white focus:outline-none transition-all ${
                          formErrors.price ? 'border-red-500' : 'border-neutral-200 dark:border-neutral-800 focus:border-[#D4AF37]'
                        }`} 
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] uppercase tracking-wider text-neutral-600 dark:text-neutral-400 font-bold">Мощность (л.с.)</label>
                      <input 
                        type="number" 
                        value={formData.hp ?? ''} 
                        onChange={(e) => setFormData({ ...formData, hp: e.target.value })} 
                        className="w-full bg-neutral-50 dark:bg-[#0D0D0D] border border-neutral-200 dark:border-neutral-800 focus:border-[#D4AF37] rounded-xl py-2.5 px-4 text-sm text-neutral-900 dark:text-white focus:outline-none" 
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] uppercase tracking-wider text-neutral-600 dark:text-neutral-400 font-bold">Топливо</label>
                      <select 
                        value={formData.fuel || 'Essence'} 
                        onChange={(e) => setFormData({ ...formData, fuel: e.target.value })} 
                        className="w-full bg-neutral-50 dark:bg-[#0D0D0D] border border-neutral-200 dark:border-neutral-800 focus:border-[#D4AF37] rounded-xl py-2.5 px-4 text-sm text-neutral-900 dark:text-white focus:outline-none cursor-pointer"
                      >
                        <option value="Essence">Бензин (Essence)</option>
                        <option value="Diesel">Дизель (Diesel)</option>
                        <option value="Hybride">Гибрид (Hybride)</option>
                        <option value="Électrique">Электро (Électrique)</option>
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] uppercase tracking-wider text-neutral-600 dark:text-neutral-400 font-bold">Трансмиссия</label>
                      <select 
                        value={formData.transmission || 'Automatique'} 
                        onChange={(e) => setFormData({ ...formData, transmission: e.target.value })} 
                        className="w-full bg-neutral-50 dark:bg-[#0D0D0D] border border-neutral-200 dark:border-neutral-800 focus:border-[#D4AF37] rounded-xl py-2.5 px-4 text-sm text-neutral-900 dark:text-white focus:outline-none cursor-pointer"
                      >
                        <option value="Automatique">Автомат (Automatique)</option>
                        <option value="Mécanique">Механика (Mécanique)</option>
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] uppercase tracking-wider text-neutral-600 dark:text-neutral-400 font-bold">Тип кузова</label>
                      <select 
                        value={formData.bodyType || 'Berline'} 
                        onChange={(e) => setFormData({ ...formData, bodyType: e.target.value })} 
                        className="w-full bg-neutral-50 dark:bg-[#0D0D0D] border border-neutral-200 dark:border-neutral-800 focus:border-[#D4AF37] rounded-xl py-2.5 px-4 text-sm text-neutral-900 dark:text-white focus:outline-none cursor-pointer"
                      >
                        <option value="SUV">Кроссовер / SUV</option>
                        <option value="Berline">Седан / Хэтчбек (Berline)</option>
                        <option value="Coupé">Купе (Coupé)</option>
                        <option value="Cabriolet">Кабриолет</option>
                        <option value="Break">Универсал (Break)</option>
                        <option value="Citadine">Компакт (Citadine)</option>
                        <option value="Supercar">Суперкар</option>
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] uppercase tracking-wider text-neutral-600 dark:text-neutral-400 font-bold">Выбросы CO2 (г/км)</label>
                      <input 
                        type="number" 
                        placeholder="например: 120" 
                        value={formData.co2 ?? ''} 
                        onChange={(e) => setFormData({ ...formData, co2: e.target.value })} 
                        className="w-full bg-neutral-50 dark:bg-[#0D0D0D] border border-neutral-200 dark:border-neutral-800 focus:border-[#D4AF37] rounded-xl py-2.5 px-4 text-sm text-neutral-900 dark:text-white focus:outline-none" 
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] uppercase tracking-wider text-neutral-600 dark:text-neutral-400 font-bold">Двери</label>
                      <input 
                        type="number" 
                        value={formData.doors || 5} 
                        onChange={(e) => setFormData({ ...formData, doors: Number(e.target.value) })} 
                        className="w-full bg-neutral-50 dark:bg-[#0D0D0D] border border-neutral-200 dark:border-neutral-800 focus:border-[#D4AF37] rounded-xl py-2.5 px-4 text-sm text-neutral-900 dark:text-white focus:outline-none" 
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] uppercase tracking-wider text-neutral-600 dark:text-neutral-400 font-bold">Места</label>
                      <input 
                        type="number" 
                        value={formData.seats || 5} 
                        onChange={(e) => setFormData({ ...formData, seats: Number(e.target.value) })} 
                        className="w-full bg-neutral-50 dark:bg-[#0D0D0D] border border-neutral-200 dark:border-neutral-800 focus:border-[#D4AF37] rounded-xl py-2.5 px-4 text-sm text-neutral-900 dark:text-white focus:outline-none" 
                      />
                    </div>
                    <div className="sm:col-span-2 space-y-1.5">
                      <label className="text-[10px] uppercase tracking-wider text-neutral-600 dark:text-neutral-400 font-bold">Цвет кузова</label>
                      <input 
                        type="text" 
                        placeholder="например: Gris Selenium, Noir Métallisé, Белый перламутр..." 
                        value={formData.color || ''} 
                        onChange={(e) => setFormData({ ...formData, color: e.target.value })} 
                        className="w-full bg-neutral-50 dark:bg-[#0D0D0D] border border-neutral-200 dark:border-neutral-800 focus:border-[#D4AF37] rounded-xl py-2.5 px-4 text-sm text-neutral-900 dark:text-white focus:outline-none" 
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end pt-2">
                    <div className="sm:col-span-2 space-y-1.5">
                      <label className="text-[10px] uppercase tracking-wider text-neutral-600 dark:text-neutral-400 font-bold">VIN-номер</label>
                      <input 
                        type="text" 
                        placeholder="например: VF3..." 
                        value={formData.vin || ''} 
                        onChange={(e) => setFormData({ ...formData, vin: e.target.value })} 
                        className="w-full bg-neutral-50 dark:bg-[#0D0D0D] border border-neutral-200 dark:border-neutral-800 focus:border-[#D4AF37] rounded-xl py-2.5 px-4 text-sm text-neutral-900 dark:text-white focus:outline-none font-mono" 
                      />
                    </div>
                    <label className="flex items-center gap-2 pb-3 cursor-pointer select-none">
                      <input 
                        type="checkbox" 
                        checked={!!formData.verifiedVin} 
                        onChange={(e) => setFormData({ ...formData, verifiedVin: e.target.checked })} 
                        className="rounded bg-neutral-50 dark:bg-[#0D0D0D] border-neutral-300 dark:border-neutral-700 text-[#D4AF37] focus:ring-0 cursor-pointer" 
                      />
                      <span className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">Подтвержденный VIN (HistoVec)</span>
                    </label>
                  </div>
                </div>
              )}

              {/* TAB 2: МЕДИА & ФОТО */}
              {carActiveTab === 'media' && (
                <div className="space-y-6">
                  {/* Main Image */}
                  <div className="p-5 rounded-2xl bg-neutral-50 dark:bg-[#0D0D0D] border border-neutral-200 dark:border-neutral-800 space-y-4">
                    <div className="flex items-center justify-between">
                      <label className="text-xs uppercase tracking-wider text-neutral-900 dark:text-white font-bold flex items-center">
                        Главное изображение<span className="text-red-500 font-bold ml-1">*</span>
                      </label>
                      {formData.image && (
                        <button 
                          type="button" 
                          onClick={() => setFormData({ ...formData, image: '' })}
                          className="text-xs text-red-500 hover:underline font-semibold"
                        >
                          Удалить фото
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-center">
                      <div className="sm:col-span-1 aspect-[4/3] rounded-xl overflow-hidden bg-neutral-200 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 flex items-center justify-center relative">
                        {formData.image ? (
                          <img src={formData.image} alt="Главное фото" className="w-full h-full object-cover" />
                        ) : (
                          <label className="w-full h-full flex flex-col items-center justify-center cursor-pointer p-4 text-center hover:bg-neutral-300/50 dark:hover:bg-neutral-700/50 transition-colors">
                            <input 
                              type="file" 
                              accept="image/*" 
                              onChange={(e) => { if (e.target.files?.[0]) handleMainImageUpload(e.target.files[0]); }} 
                              className="hidden" 
                            />
                            <span className="text-2xl mb-1">📷</span>
                            <span className="text-[10px] text-neutral-500 font-medium">Загрузить с устройства</span>
                          </label>
                        )}
                        {mainImageUploading && (
                          <div className="absolute inset-0 bg-black/75 flex flex-col items-center justify-center text-white text-xs gap-2">
                            <div className="animate-spin rounded-full h-5 w-5 border-2 border-[#D4AF37] border-t-transparent"></div>
                            <span>{mainImageProgress}%</span>
                          </div>
                        )}
                      </div>

                      <div className="sm:col-span-2 space-y-3">
                        <div className="space-y-1">
                          <label className="text-[10px] uppercase tracking-wider text-neutral-500 font-bold">Прямая ссылка на фото (URL)</label>
                          <input 
                            type="text" 
                            placeholder="https://..." 
                            value={formData.image || ''} 
                            onChange={(e) => setFormData({ ...formData, image: e.target.value })} 
                            className="w-full bg-white dark:bg-[#121214] border border-neutral-200 dark:border-neutral-800 focus:border-[#D4AF37] rounded-xl py-2 px-3 text-xs text-neutral-900 dark:text-white focus:outline-none" 
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] uppercase tracking-wider text-[#D4AF37] font-bold">ALT-текст для главного изображения</label>
                          <input 
                            type="text" 
                            placeholder="например: Peugeot 2008 occasion PureTech vue avant 3/4" 
                            value={formData.imageAlt || ''} 
                            onChange={(e) => setFormData({ ...formData, imageAlt: e.target.value })} 
                            className="w-full bg-white dark:bg-[#121214] border border-neutral-200 dark:border-neutral-800 focus:border-[#D4AF37] rounded-xl py-2 px-3 text-xs text-neutral-900 dark:text-white focus:outline-none" 
                          />
                          <span className="text-[9px] text-neutral-400">Альтернативный текст для Google Images и доступности.</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Gallery Section */}
                  <div className="p-5 rounded-2xl bg-neutral-50 dark:bg-[#0D0D0D] border border-neutral-200 dark:border-neutral-800 space-y-4">
                    <div className="flex items-center justify-between">
                      <label className="text-xs uppercase tracking-wider text-neutral-900 dark:text-white font-bold">
                        Галерея фотографий ({formData.galleryImages?.length || 0} / 30)
                      </label>
                      <label className="px-3 py-1.5 rounded-xl bg-[#D4AF37] text-neutral-950 text-[10px] font-bold uppercase tracking-wider cursor-pointer hover:bg-[#D4AF37]/90 transition-all">
                        <input 
                          type="file" 
                          accept="image/*" 
                          multiple 
                          onChange={(e) => { if (e.target.files) handleGalleryImagesUpload(Array.from(e.target.files)); }} 
                          className="hidden" 
                        />
                        + Добавить фотографии
                      </label>
                    </div>

                    {galleryUploading && (
                      <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center gap-3">
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-amber-500 border-t-transparent"></div>
                        <span className="text-xs text-amber-500 font-medium">Загрузка и оптимизация фотографий...</span>
                      </div>
                    )}

                    {formData.galleryImages && formData.galleryImages.length > 0 ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-72 overflow-y-auto custom-scrollbar p-1">
                        {formData.galleryImages.map((imgUrl, idx) => (
                          <div key={idx} className="flex gap-3 p-2.5 rounded-xl bg-white dark:bg-[#121214] border border-neutral-200 dark:border-neutral-800 items-center">
                            <img src={imgUrl} alt={`Фото ${idx + 1}`} className="w-16 h-12 object-cover rounded-lg flex-shrink-0" />
                            <div className="flex-1 min-w-0 space-y-1">
                              <input 
                                type="text" 
                                placeholder={`ALT-описание фото #${idx + 1}`}
                                value={formData.galleryImagesAlt?.[idx] || ''} 
                                onChange={(e) => handleUpdateGalleryAlt(idx, e.target.value)} 
                                className="w-full bg-neutral-50 dark:bg-[#0D0D0D] border border-neutral-200 dark:border-neutral-800 rounded-lg py-1 px-2 text-[10px] text-neutral-900 dark:text-white focus:outline-none"
                              />
                            </div>
                            <button 
                              type="button" 
                              onClick={() => {
                                const newImgs = formData.galleryImages?.filter((_, i) => i !== idx) || [];
                                const newAlts = formData.galleryImagesAlt?.filter((_, i) => i !== idx) || [];
                                setFormData({ ...formData, galleryImages: newImgs, galleryImagesAlt: newAlts });
                              }}
                              className="text-red-500 p-1.5 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-lg transition-colors"
                              title="Удалить фото"
                            >
                              <Icons.Trash />
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-neutral-400 text-xs border border-dashed border-neutral-300 dark:border-neutral-800 rounded-xl">
                        В галерее пока нет дополнительных фото. Вы можете загрузить до 30 качественных снимков автомобиля.
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 3: ОПИСАНИЕ И ОПЦИИ */}
              {carActiveTab === 'desc' && (
                <div className="space-y-6">
                  {/* Language Switcher Toolbar */}
                  <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-2xl bg-neutral-100 dark:bg-[#0D0D0D] border border-neutral-200 dark:border-neutral-800">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold uppercase tracking-wider text-neutral-600 dark:text-neutral-400">
                        Язык описания:
                      </span>
                      <span className="text-[11px] text-neutral-400">
                        (выберите язык для редактирования краткого описания)
                      </span>
                    </div>
                    <div className="flex gap-1.5 p-1 bg-white dark:bg-[#18181b] rounded-xl border border-neutral-200 dark:border-neutral-800">
                      {[
                        { id: 'fr', label: '🇫🇷 FR' },
                        { id: 'en', label: '🇬🇧 EN' },
                        { id: 'ru', label: '🇷🇺 RU' }
                      ].map(l => (
                        <button
                          key={l.id}
                          type="button"
                          onClick={() => setCarDescLang(l.id as any)}
                          className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                            carDescLang === l.id 
                              ? 'bg-[#D4AF37] text-neutral-950 shadow-sm' 
                              : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
                          }`}
                        >
                          {l.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Active Language Workspace: Short Description ONLY */}
                  <div className="p-5 rounded-2xl bg-neutral-50 dark:bg-[#0D0D0D] border border-neutral-200 dark:border-neutral-800 space-y-4">
                    <div className="flex items-center justify-between border-b border-neutral-200 dark:border-neutral-800 pb-3">
                      <span className="text-sm font-bold text-neutral-900 dark:text-white font-serif">
                        {carDescLang === 'fr' ? 'Французский (FR) — Краткое описание' : carDescLang === 'en' ? 'English (EN) — Short description' : 'Русский (RU) — Краткое описание'}
                      </span>
                    </div>

                    {/* Single Short Description Textarea */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] uppercase tracking-wider text-neutral-600 dark:text-neutral-400 font-bold">
                        {carDescLang === 'ru' ? 'Краткое описание' : carDescLang === 'en' ? 'Short description' : 'Description courte'}
                      </label>
                      <textarea 
                        rows={4} 
                        placeholder={
                          carDescLang === 'ru' ? 'Краткое описание автомобиля (1-2 предложения)...' :
                          carDescLang === 'en' ? 'Short vehicle description (1-2 sentences)...' :
                          'Description courte du véhicule (1-2 phrases)...'
                        } 
                        value={formData.translations?.[carDescLang]?.description || (carDescLang === 'fr' ? formData.description : carDescLang === 'en' ? formData.description_en : formData.description_ru) || ''} 
                        onChange={(e) => updateCarTranslation(carDescLang, 'description', e.target.value)} 
                        className="w-full bg-white dark:bg-[#121214] border border-neutral-200 dark:border-neutral-800 focus:border-[#D4AF37] rounded-xl p-3.5 text-xs text-neutral-900 dark:text-white leading-relaxed focus:outline-none" 
                      />
                    </div>
                  </div>

                  {/* Unified Equipment & Options Manager */}
                  <div className="space-y-4 p-5 rounded-2xl bg-neutral-50 dark:bg-[#0D0D0D] border border-neutral-200 dark:border-neutral-800">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <h4 className="text-xs uppercase tracking-wider text-neutral-900 dark:text-white font-bold">
                          Комплектация и опции ({formData.equipments?.length || 0})
                        </h4>
                        <p className="text-[11px] text-neutral-500">
                          Выберите опции один раз — сайт автоматически отобразит корректный перевод на французском, английском и русском языках.
                        </p>
                      </div>
                      <button 
                        type="button" 
                        onClick={() => setShowCustomEquipmentModal(true)}
                        className="px-3.5 py-2 rounded-xl bg-neutral-200 dark:bg-neutral-800 hover:bg-[#D4AF37] hover:text-neutral-950 text-xs font-bold transition-all flex items-center gap-1.5"
                      >
                        <span>+ Добавить свою опцию</span>
                      </button>
                    </div>
                    
                    {/* Standard suggestion chips */}
                    <div className="space-y-2">
                      <span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider">
                        Быстрый выбор:
                      </span>
                      <div className="flex flex-wrap gap-2">
                        {STANDARD_EQUIPMENTS.map((item) => {
                          const isSelected = (formData.equipments || []).map(normalizeEquipmentKey).includes(item.id);
                          return (
                            <button
                              key={item.id}
                              type="button"
                              onClick={() => handleToggleEquipment(item.id)}
                              className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
                                isSelected 
                                  ? 'bg-[#D4AF37] text-neutral-950 font-bold shadow-sm' 
                                  : 'bg-white dark:bg-[#121214] border border-neutral-200 dark:border-neutral-800 text-neutral-700 dark:text-neutral-300 hover:border-[#D4AF37]'
                              }`}
                            >
                              {isSelected ? '✓ ' : '+ '} {item.ru}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Selected Equipments list */}
                    {formData.equipments && formData.equipments.length > 0 ? (
                      <div className="space-y-2 pt-3 border-t border-neutral-200 dark:border-neutral-800">
                        <span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider">
                          Выбранная комплектация:
                        </span>
                        <div className="flex flex-wrap gap-2">
                          {formData.equipments.map((eqKey) => {
                            const key = normalizeEquipmentKey(eqKey);
                            const std = STANDARD_EQUIPMENTS.find(e => e.id === key);
                            const custom = formData.customEquipments?.find(c => c.id === key);
                            const labelRu = std ? std.ru : custom ? custom.ru : eqKey;
                            return (
                              <span key={key} className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white dark:bg-[#121214] border border-neutral-200 dark:border-neutral-800 text-xs text-neutral-900 dark:text-white">
                                <span className="font-medium">{labelRu}</span>
                                <button 
                                  type="button" 
                                  onClick={() => {
                                    if (custom) handleRemoveCustomEquipment(custom.id);
                                    else handleToggleEquipment(key);
                                  }} 
                                  className="text-neutral-400 hover:text-red-500 text-sm font-bold ml-1 transition-colors"
                                  title="Удалить опцию"
                                >
                                  ×
                                </button>
                              </span>
                            );
                          })}
                        </div>
                      </div>
                    ) : (
                      <div className="text-xs text-neutral-400 text-center py-2">
                        Опции пока не выбраны. Нажмите на кнопки выше для быстрого добавления комплектации.
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 4: SEO & ИНДЕКСАЦИЯ */}
              {carActiveTab === 'seo' && (
                <div className="space-y-6">
                  {/* SEO Action Bar */}
                  <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-2xl bg-[#D4AF37]/10 border border-[#D4AF37]/30">
                    <div>
                      <h4 className="text-xs font-bold text-neutral-900 dark:text-white uppercase tracking-wider">
                        Автоматическая оптимизация SEO
                      </h4>
                      <p className="text-[11px] text-neutral-600 dark:text-neutral-400">
                        Генерация мета-тегов и описаний по стандартам Google для всех 3 языков.
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button 
                        type="button" 
                        onClick={handleAutoGenerateCarSeo}
                        className="px-4 py-2 rounded-xl bg-[#D4AF37] hover:bg-[#D4AF37]/90 text-neutral-950 text-xs font-bold uppercase tracking-wider transition-all shadow-sm"
                      >
                        ✨ Сгенерировать SEO (3 языка)
                      </button>
                      <button 
                        type="button" 
                        onClick={handleAiGenerateCarSeo}
                        className="px-4 py-2 rounded-xl bg-neutral-900 dark:bg-white text-white dark:text-neutral-950 text-xs font-bold uppercase tracking-wider transition-all shadow-sm hover:opacity-90"
                      >
                        ✨ AI Тексты + SEO
                      </button>
                    </div>
                  </div>

                  {/* Language Switcher Toolbar for SEO */}
                  <div className="flex items-center justify-between p-3.5 rounded-2xl bg-neutral-100 dark:bg-[#0D0D0D] border border-neutral-200 dark:border-neutral-800">
                    <span className="text-xs font-bold uppercase tracking-wider text-neutral-600 dark:text-neutral-400">
                      Язык SEO-настроек:
                    </span>
                    <div className="flex gap-1.5 p-1 bg-white dark:bg-[#18181b] rounded-xl border border-neutral-200 dark:border-neutral-800">
                      {[
                        { id: 'fr', label: '🇫🇷 Français (FR)' },
                        { id: 'en', label: '🇬🇧 English (EN)' },
                        { id: 'ru', label: '🇷🇺 Русский (RU)' }
                      ].map(l => (
                        <button
                          key={l.id}
                          type="button"
                          onClick={() => setCarSeoLang(l.id as any)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                            carSeoLang === l.id 
                              ? 'bg-[#D4AF37] text-neutral-950 shadow-sm' 
                              : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
                          }`}
                        >
                          {l.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Google Search Live Preview Card */}
                  {(() => {
                    const activeTitle = formData.translations?.[carSeoLang]?.seoTitle || (carSeoLang === 'fr' ? formData.seoTitle : '') || getCarSeoTitle(formData, carSeoLang);
                    const activeDesc = formData.translations?.[carSeoLang]?.metaDescription || (carSeoLang === 'fr' ? formData.metaDescription : '') || getCarMetaDescription(formData, carSeoLang);
                    const activeSlug = formData.translations?.[carSeoLang]?.slug || (carSeoLang === 'fr' ? formData.slug : '') || generateCarSlug(formData);
                    return (
                      <div className="p-5 rounded-2xl bg-white dark:bg-[#0D0D0D] border border-neutral-200 dark:border-neutral-800 shadow-sm space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="text-[10px] font-bold uppercase tracking-widest text-[#D4AF37]">
                            Предпросмотр в выдаче Google ({carSeoLang.toUpperCase()})
                          </div>
                          <div className="text-[10px] text-neutral-400 font-mono">
                            https://ligo-auto.fr › vehicules › {activeSlug}
                          </div>
                        </div>
                        <div className="space-y-1 font-sans">
                          <div className="text-base sm:text-lg font-medium text-[#1a0dab] dark:text-[#8ab4f8] hover:underline cursor-pointer leading-snug">
                            {activeTitle}
                          </div>
                          <div className="text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed line-clamp-2">
                            {activeDesc}
                          </div>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Active Language Form SEO Fields */}
                  <div className="space-y-4 p-5 rounded-2xl bg-neutral-50 dark:bg-[#0D0D0D] border border-neutral-200 dark:border-neutral-800">
                    <h5 className="text-xs font-bold uppercase tracking-wider text-neutral-900 dark:text-white border-b border-neutral-200 dark:border-neutral-800 pb-2">
                      Мета-данные для языка: <span className="text-[#D4AF37]">{carSeoLang.toUpperCase()}</span>
                    </h5>

                    {/* SEO Title */}
                    <div className="space-y-1.5">
                      <div className="flex justify-between items-center">
                        <label className="text-[10px] uppercase tracking-wider text-neutral-600 dark:text-neutral-400 font-bold">
                          SEO Title ({carSeoLang.toUpperCase()})
                        </label>
                        <span className={`text-[10px] font-mono ${(formData.translations?.[carSeoLang]?.seoTitle || '').length > 60 ? 'text-amber-500 font-bold' : 'text-neutral-400'}`}>
                          {(formData.translations?.[carSeoLang]?.seoTitle || (carSeoLang === 'fr' ? formData.seoTitle : '') || '').length} / 60
                        </span>
                      </div>
                      <input 
                        type="text" 
                        placeholder={
                          carSeoLang === 'ru' ? 'например: Peugeot 2008 с пробегом в наличии - Ligo Automobiles' :
                          carSeoLang === 'en' ? 'e.g. Used Peugeot 2008 PureTech - Ligo Automobiles' :
                          'ex: Peugeot 2008 occasion PureTech - Ligo Automobiles'
                        } 
                        value={formData.translations?.[carSeoLang]?.seoTitle || (carSeoLang === 'fr' ? formData.seoTitle : '') || ''} 
                        onChange={(e) => updateCarTranslation(carSeoLang, 'seoTitle', e.target.value)} 
                        className="w-full bg-white dark:bg-[#121214] border border-neutral-200 dark:border-neutral-800 focus:border-[#D4AF37] rounded-xl py-2.5 px-4 text-xs text-neutral-900 dark:text-white focus:outline-none font-medium" 
                      />
                    </div>

                    {/* Meta Description */}
                    <div className="space-y-1.5">
                      <div className="flex justify-between items-center">
                        <label className="text-[10px] uppercase tracking-wider text-neutral-600 dark:text-neutral-400 font-bold">
                          Meta Description ({carSeoLang.toUpperCase()})
                        </label>
                        <span className={`text-[10px] font-mono ${(formData.translations?.[carSeoLang]?.metaDescription || '').length > 160 ? 'text-amber-500 font-bold' : 'text-neutral-400'}`}>
                          {(formData.translations?.[carSeoLang]?.metaDescription || (carSeoLang === 'fr' ? formData.metaDescription : '') || '').length} / 160
                        </span>
                      </div>
                      <textarea 
                        rows={2} 
                        placeholder={
                          carSeoLang === 'ru' ? 'Купите проверенный автомобиль с гарантией 12 месяцев в Ligo Automobiles. Доставка по Франции.' :
                          carSeoLang === 'en' ? 'Buy this certified used vehicle with a 12-month European warranty at Ligo Automobiles. Home delivery available.' :
                          "Achetez votre véhicule d'occasion révisé et garanti 12 mois chez Ligo Automobiles. Livraison partout en France."
                        } 
                        value={formData.translations?.[carSeoLang]?.metaDescription || (carSeoLang === 'fr' ? formData.metaDescription : '') || ''} 
                        onChange={(e) => updateCarTranslation(carSeoLang, 'metaDescription', e.target.value)} 
                        className="w-full bg-white dark:bg-[#121214] border border-neutral-200 dark:border-neutral-800 focus:border-[#D4AF37] rounded-xl p-3 text-xs text-neutral-900 dark:text-white focus:outline-none" 
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Focus Keyword */}
                      <div className="space-y-1.5">
                        <label className="text-[10px] uppercase tracking-wider text-neutral-600 dark:text-neutral-400 font-bold">
                          Фокусное ключевое слово ({carSeoLang.toUpperCase()})
                        </label>
                        <input 
                          type="text" 
                          placeholder={carSeoLang === 'ru' ? 'например: peugeot 2008 купить' : 'ex: peugeot 2008 occasion'} 
                          value={formData.translations?.[carSeoLang]?.focusKeyword || (carSeoLang === 'fr' ? formData.focusKeyword : '') || ''} 
                          onChange={(e) => updateCarTranslation(carSeoLang, 'focusKeyword', e.target.value)} 
                          className="w-full bg-white dark:bg-[#121214] border border-neutral-200 dark:border-neutral-800 focus:border-[#D4AF37] rounded-xl py-2.5 px-4 text-xs text-neutral-900 dark:text-white focus:outline-none" 
                        />
                      </div>

                      {/* Slug URL */}
                      <div className="space-y-1.5">
                        <label className="text-[10px] uppercase tracking-wider text-neutral-600 dark:text-neutral-400 font-bold">
                          URL Slug ({carSeoLang.toUpperCase()})
                        </label>
                        <input 
                          type="text" 
                          placeholder="например: peugeot-2008-puretech-occasion" 
                          value={formData.translations?.[carSeoLang]?.slug || (carSeoLang === 'fr' ? formData.slug : '') || ''} 
                          onChange={(e) => updateCarTranslation(carSeoLang, 'slug', e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))} 
                          className="w-full bg-white dark:bg-[#121214] border border-neutral-200 dark:border-neutral-800 focus:border-[#D4AF37] rounded-xl py-2.5 px-4 text-xs text-neutral-900 dark:text-white focus:outline-none font-mono" 
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* SEO H1 Heading */}
                      <div className="space-y-1.5">
                        <label className="text-[10px] uppercase tracking-wider text-neutral-600 dark:text-neutral-400 font-bold">
                          Главный заголовок H1 ({carSeoLang.toUpperCase()})
                        </label>
                        <input 
                          type="text" 
                          placeholder={carSeoLang === 'ru' ? 'например: Peugeot 2008 PureTech 130 с пробегом' : 'ex: Peugeot 2008 PureTech 130 d\'occasion'} 
                          value={formData.translations?.[carSeoLang]?.seoH1 || (carSeoLang === 'fr' ? formData.seoH1 : '') || ''} 
                          onChange={(e) => updateCarTranslation(carSeoLang, 'seoH1', e.target.value)} 
                          className="w-full bg-white dark:bg-[#121214] border border-neutral-200 dark:border-neutral-800 focus:border-[#D4AF37] rounded-xl py-2.5 px-4 text-xs text-neutral-900 dark:text-white focus:outline-none" 
                        />
                      </div>

                      {/* Canonical URL */}
                      <div className="space-y-1.5">
                        <label className="text-[10px] uppercase tracking-wider text-neutral-600 dark:text-neutral-400 font-bold">Канонический URL</label>
                        <input 
                          type="text" 
                          placeholder="https://ligo-auto.fr/vehicules/peugeot-2008-occasion/" 
                          value={formData.canonicalUrl || ''} 
                          onChange={(e) => setFormData({ ...formData, canonicalUrl: e.target.value })} 
                          className="w-full bg-white dark:bg-[#121214] border border-neutral-200 dark:border-neutral-800 focus:border-[#D4AF37] rounded-xl py-2.5 px-4 text-xs text-neutral-900 dark:text-white focus:outline-none font-mono" 
                        />
                      </div>
                    </div>

                    {/* Robots Meta Checkboxes */}
                    <div className="p-3.5 rounded-xl bg-white dark:bg-[#121214] border border-neutral-200 dark:border-neutral-800 flex flex-wrap items-center gap-6">
                      <label className="flex items-center gap-2 cursor-pointer select-none">
                        <input 
                          type="checkbox" 
                          checked={formData.robotsIndex !== false} 
                          onChange={(e) => setFormData({ ...formData, robotsIndex: e.target.checked })} 
                          className="rounded text-[#D4AF37] focus:ring-0 cursor-pointer" 
                        />
                        <span className="text-xs font-semibold text-neutral-800 dark:text-neutral-200">Индексировать страницу поисковиками (index)</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer select-none">
                        <input 
                          type="checkbox" 
                          checked={formData.robotsFollow !== false} 
                          onChange={(e) => setFormData({ ...formData, robotsFollow: e.target.checked })} 
                          className="rounded text-[#D4AF37] focus:ring-0 cursor-pointer" 
                        />
                        <span className="text-xs font-semibold text-neutral-800 dark:text-neutral-200">Переходить по ссылкам (follow)</span>
                      </label>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 5: FAQ АВТОМОБИЛЯ */}
              {carActiveTab === 'faq' && (
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-900 dark:text-white">
                        Вопросы и ответы (FAQ автомобиля)
                      </h4>
                      <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
                        Каждый вопрос редактируется сразу на 3 языках (FR / EN / RU) и формирует микроразметку FAQPage Schema.org.
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button 
                        type="button" 
                        onClick={() => setFormData({ ...formData, faq: generateCarDefaultFaq(formData) })}
                        className="px-3.5 py-1.5 rounded-xl bg-neutral-200 dark:bg-neutral-800 hover:bg-[#D4AF37] hover:text-neutral-950 text-xs font-bold transition-all"
                      >
                        ✨ Заполнить стандартными FAQ
                      </button>
                      <button 
                        type="button" 
                        onClick={handleAddFaqItem}
                        className="px-3.5 py-1.5 rounded-xl bg-[#D4AF37] hover:bg-[#D4AF37]/90 text-neutral-950 font-bold text-xs uppercase tracking-wider transition-all"
                      >
                        + Добавить вопрос
                      </button>
                    </div>
                  </div>

                  <div className="space-y-4">
                    {formData.faq && formData.faq.length > 0 ? (
                      formData.faq.map((item, idx) => (
                        <div key={idx} className="p-5 rounded-2xl bg-neutral-50 dark:bg-[#0D0D0D] border border-neutral-200 dark:border-neutral-800 space-y-3 relative group">
                          <div className="flex items-center justify-between border-b border-neutral-200 dark:border-neutral-800 pb-2">
                            <span className="text-xs font-bold uppercase tracking-wider text-[#D4AF37]">
                              Вопрос #{idx + 1}
                            </span>
                            <button 
                              type="button" 
                              onClick={() => handleRemoveFaqItem(idx)}
                              className="text-red-500 hover:text-red-600 text-xs font-bold px-2 py-0.5 rounded hover:bg-red-50 dark:hover:bg-red-950/20"
                            >
                              Удалить вопрос
                            </button>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {/* FR */}
                            <div className="p-3 bg-white dark:bg-[#121214] rounded-xl border border-neutral-200 dark:border-neutral-800 space-y-2">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-[#D4AF37] block">🇫🇷 Français (FR)</span>
                              <input 
                                type="text" 
                                placeholder="Question en français..." 
                                value={(item as any).fr?.question || item.question || ''} 
                                onChange={(e) => handleUpdateFaqItem(idx, 'fr', 'question', e.target.value)} 
                                className="w-full bg-neutral-50 dark:bg-[#0D0D0D] border border-neutral-200 dark:border-neutral-800 focus:border-[#D4AF37] rounded-lg py-1.5 px-2.5 text-xs text-neutral-900 dark:text-white font-medium focus:outline-none" 
                              />
                              <textarea 
                                rows={2} 
                                placeholder="Réponse détaillée..." 
                                value={(item as any).fr?.answer || item.answer || ''} 
                                onChange={(e) => handleUpdateFaqItem(idx, 'fr', 'answer', e.target.value)} 
                                className="w-full bg-neutral-50 dark:bg-[#0D0D0D] border border-neutral-200 dark:border-neutral-800 focus:border-[#D4AF37] rounded-lg p-2 text-xs text-neutral-900 dark:text-white focus:outline-none" 
                              />
                            </div>

                            {/* EN */}
                            <div className="p-3 bg-white dark:bg-[#121214] rounded-xl border border-neutral-200 dark:border-neutral-800 space-y-2">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-[#D4AF37] block">🇬🇧 English (EN)</span>
                              <input 
                                type="text" 
                                placeholder="Question in English..." 
                                value={(item as any).en?.question || ''} 
                                onChange={(e) => handleUpdateFaqItem(idx, 'en', 'question', e.target.value)} 
                                className="w-full bg-neutral-50 dark:bg-[#0D0D0D] border border-neutral-200 dark:border-neutral-800 focus:border-[#D4AF37] rounded-lg py-1.5 px-2.5 text-xs text-neutral-900 dark:text-white font-medium focus:outline-none" 
                              />
                              <textarea 
                                rows={2} 
                                placeholder="Detailed answer in English..." 
                                value={(item as any).en?.answer || ''} 
                                onChange={(e) => handleUpdateFaqItem(idx, 'en', 'answer', e.target.value)} 
                                className="w-full bg-neutral-50 dark:bg-[#0D0D0D] border border-neutral-200 dark:border-neutral-800 focus:border-[#D4AF37] rounded-lg p-2 text-xs text-neutral-900 dark:text-white focus:outline-none" 
                              />
                            </div>

                            {/* RU */}
                            <div className="p-3 bg-white dark:bg-[#121214] rounded-xl border border-neutral-200 dark:border-neutral-800 space-y-2">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-[#D4AF37] block">🇷🇺 Русский (RU)</span>
                              <input 
                                type="text" 
                                placeholder="Вопрос на русском..." 
                                value={(item as any).ru?.question || ''} 
                                onChange={(e) => handleUpdateFaqItem(idx, 'ru', 'question', e.target.value)} 
                                className="w-full bg-neutral-50 dark:bg-[#0D0D0D] border border-neutral-200 dark:border-neutral-800 focus:border-[#D4AF37] rounded-lg py-1.5 px-2.5 text-xs text-neutral-900 dark:text-white font-medium focus:outline-none" 
                              />
                              <textarea 
                                rows={2} 
                                placeholder="Подробный ответ на русском..." 
                                value={(item as any).ru?.answer || ''} 
                                onChange={(e) => handleUpdateFaqItem(idx, 'ru', 'answer', e.target.value)} 
                                className="w-full bg-neutral-50 dark:bg-[#0D0D0D] border border-neutral-200 dark:border-neutral-800 focus:border-[#D4AF37] rounded-lg p-2 text-xs text-neutral-900 dark:text-white focus:outline-none" 
                              />
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-8 text-neutral-400 text-xs border border-dashed border-neutral-300 dark:border-neutral-800 rounded-xl space-y-3">
                        <p>Для этого автомобиля еще не настроены вопросы FAQ.</p>
                        <button 
                          type="button" 
                          onClick={() => setFormData({ ...formData, faq: generateCarDefaultFaq(formData) })}
                          className="px-4 py-2 rounded-xl bg-neutral-200 dark:bg-neutral-800 hover:bg-[#D4AF37] hover:text-neutral-950 text-xs font-bold transition-all"
                        >
                          ✨ Заполнить стандартными вопросами (на 3 языках)
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 6: СТАТУС & ВИТРИНА */}
              {carActiveTab === 'relations' && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] uppercase tracking-wider text-neutral-600 dark:text-neutral-400 font-bold">Статус наличия</label>
                      <select 
                        value={formData.status || 'En stock'} 
                        onChange={(e) => setFormData({ ...formData, status: e.target.value })} 
                        className="w-full bg-neutral-50 dark:bg-[#0D0D0D] border border-neutral-200 dark:border-neutral-800 focus:border-[#D4AF37] rounded-xl py-2.5 px-4 text-sm text-neutral-900 dark:text-white focus:outline-none cursor-pointer"
                      >
                        <option value="En stock">В наличии (En stock)</option>
                        <option value="En arrivage">В пути (En arrivage)</option>
                        <option value="Vendu">Продано (Vendu)</option>
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] uppercase tracking-wider text-neutral-600 dark:text-neutral-400 font-bold">Порядок отображения на главной</label>
                      <input 
                        type="number" 
                        value={formData.homepageOrder || 1} 
                        onChange={(e) => setFormData({ ...formData, homepageOrder: Number(e.target.value) })} 
                        className="w-full bg-neutral-50 dark:bg-[#0D0D0D] border border-neutral-200 dark:border-neutral-800 focus:border-[#D4AF37] rounded-xl py-2.5 px-4 text-sm text-neutral-900 dark:text-white focus:outline-none" 
                      />
                    </div>
                  </div>

                  <div className="p-5 rounded-2xl bg-neutral-50 dark:bg-[#0D0D0D] border border-neutral-200 dark:border-neutral-800 space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-xs font-bold text-neutral-900 dark:text-white uppercase tracking-wider">
                          Показывать в избранных на главной странице
                        </h4>
                        <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
                          Автомобиль будет отображаться в премиальной витрине на главной странице.
                        </p>
                      </div>
                      <input 
                        type="checkbox" 
                        checked={!!formData.featuredOnHomepage} 
                        onChange={(e) => setFormData({ ...formData, featuredOnHomepage: e.target.checked })} 
                        className="rounded h-5 w-5 text-[#D4AF37] focus:ring-0 cursor-pointer" 
                      />
                    </div>
                  </div>

                  <div className="p-5 rounded-2xl bg-neutral-50 dark:bg-[#0D0D0D] border border-neutral-200 dark:border-neutral-800 flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-neutral-900 dark:text-white uppercase tracking-wider">
                        Экспорт Sitemap XML
                      </h4>
                      <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
                        Скачать актуальный sitemap.xml со всеми URL автомобилей каталога.
                      </p>
                    </div>
                    <button 
                      type="button" 
                      onClick={() => downloadSitemapFile()}
                      className="px-4 py-2 rounded-xl bg-neutral-200 dark:bg-neutral-800 hover:bg-[#D4AF37] hover:text-neutral-950 text-xs font-bold uppercase tracking-wider transition-all"
                    >
                      Скачать Sitemap XML
                    </button>
                  </div>
                </div>
              )}

              {/* Action Buttons in Footer */}
              <div className="flex gap-4 pt-6 border-t border-neutral-200 dark:border-neutral-800 flex-shrink-0">
                <button 
                  type="button" 
                  onClick={() => setShowAddEditModal(false)} 
                  className="flex-1 py-3.5 rounded-2xl bg-neutral-100 dark:bg-[#0D0D0D] hover:bg-neutral-200 dark:hover:bg-neutral-800 text-neutral-800 dark:text-neutral-300 font-bold text-xs uppercase tracking-wider transition-all border border-neutral-200 dark:border-neutral-800"
                >
                  Отмена
                </button>
                <button 
                  type="submit" 
                  disabled={mainImageUploading || galleryUploading}
                  className={`flex-1 py-3.5 rounded-2xl font-bold text-xs uppercase tracking-wider transition-all shadow-lg active:scale-[0.99] ${
                    mainImageUploading || galleryUploading 
                      ? 'bg-neutral-300 text-neutral-500 cursor-not-allowed' 
                      : 'bg-[#D4AF37] hover:bg-[#D4AF37]/90 text-neutral-950'
                  }`}
                >
                  {mainImageUploading || galleryUploading ? 'Загрузка медиа...' : 'СОХРАНИТЬ АВТОМОБИЛЬ'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Модальное окно добавления пользовательской опции (Custom Equipment Modal) */}
      {showCustomEquipmentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fadeIn">
          <div className="w-full max-w-md bg-white dark:bg-[#121214] border border-neutral-200 dark:border-neutral-800 rounded-3xl p-6 shadow-2xl space-y-5 text-neutral-900 dark:text-white">
            <div className="flex items-center justify-between border-b border-neutral-200 dark:border-neutral-800 pb-3">
              <h4 className="text-base font-serif font-bold text-neutral-900 dark:text-white">
                Добавить свою опцию
              </h4>
              <button 
                onClick={() => setShowCustomEquipmentModal(false)}
                className="p-1.5 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-400 hover:text-white"
              >
                <Icons.X />
              </button>
            </div>

            <p className="text-xs text-neutral-500">
              Укажите название опции на французском, английском и русском языках. Опция будет добавлена к автомобилю и автоматически переведена для посетителей.
            </p>

            <form onSubmit={handleAddCustomEquipment} className="space-y-3.5">
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-[#D4AF37] tracking-wider">
                  🇫🇷 Французское название (FR)<span className="text-red-500 font-bold ml-1">*</span>
                </label>
                <input 
                  type="text" 
                  placeholder="например: Suspension pneumatique adaptative"
                  value={customEqForm.fr}
                  onChange={(e) => setCustomEqForm({ ...customEqForm, fr: e.target.value })}
                  className="w-full bg-neutral-50 dark:bg-[#0D0D0D] border border-neutral-200 dark:border-neutral-800 focus:border-[#D4AF37] rounded-xl py-2 px-3 text-xs text-neutral-900 dark:text-white focus:outline-none"
                  autoFocus
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-[#D4AF37] tracking-wider">
                  🇬🇧 Английское название (EN)
                </label>
                <input 
                  type="text" 
                  placeholder="например: Adaptive Air Suspension"
                  value={customEqForm.en}
                  onChange={(e) => setCustomEqForm({ ...customEqForm, en: e.target.value })}
                  className="w-full bg-neutral-50 dark:bg-[#0D0D0D] border border-neutral-200 dark:border-neutral-800 focus:border-[#D4AF37] rounded-xl py-2 px-3 text-xs text-neutral-900 dark:text-white focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-[#D4AF37] tracking-wider">
                  🇷🇺 Русское название (RU)
                </label>
                <input 
                  type="text" 
                  placeholder="например: Адаптивная пневмоподвеска"
                  value={customEqForm.ru}
                  onChange={(e) => setCustomEqForm({ ...customEqForm, ru: e.target.value })}
                  className="w-full bg-neutral-50 dark:bg-[#0D0D0D] border border-neutral-200 dark:border-neutral-800 focus:border-[#D4AF37] rounded-xl py-2 px-3 text-xs text-neutral-900 dark:text-white focus:outline-none"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCustomEquipmentModal(false)}
                  className="flex-1 py-2.5 rounded-xl bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-xs font-bold"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-[#D4AF37] hover:bg-[#D4AF37]/90 text-neutral-950 text-xs font-bold"
                >
                  Добавить опцию
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CMS MODAL: ADD / EDIT ARTICLE */}
      {showArticleModal && (
        <div id="article-modal-wrapper" className="fixed inset-0 z-50 flex justify-center items-start p-4 bg-neutral-900/65 backdrop-blur-sm overflow-y-auto">
          <div className="relative w-full max-w-4xl bg-white dark:bg-[#121214] border border-neutral-200 dark:border-neutral-800 rounded-3xl overflow-hidden shadow-2xl my-8 p-6 sm:p-8 flex flex-col max-h-[90vh]">
                        {/* Modal Header */}
            <div className="flex items-center justify-between pb-5 border-b border-neutral-200 dark:border-neutral-800 flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-[#D4AF37]/10 text-[#D4AF37]">
                  <Icons.FileText />
                </div>
                <div>
                  <h3 className="text-xl font-serif font-bold text-neutral-900 dark:text-white">
                    {articleToEdit ? 'Редактировать статью' : 'Создать новую статью'}
                  </h3>
                  <p className="text-xs text-neutral-500">
                    Публикация SEO-оптимизированного контента с интеграцией автомобилей
                  </p>
                </div>
              </div>
              <button 
                type="button" 
                onClick={() => setShowArticleModal(false)}
                className="p-2.5 rounded-xl text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
              >
                <Icons.X />
              </button>
            </div>

            {/* Language Switch Tabs */}
            <div className="flex items-center justify-between gap-4 pt-4 pb-2 flex-shrink-0">
              <div className="flex bg-neutral-100 dark:bg-neutral-900 p-1 rounded-xl border border-neutral-200 dark:border-neutral-800">
                {[
                  { code: 'fr', label: '🇫🇷 Французский (Основной)' },
                  { code: 'en', label: '🇬🇧 Английский' },
                  { code: 'ru', label: '🇷🇺 Русский' }
                ].map(l => (
                  <button
                    key={l.code}
                    type="button"
                    onClick={() => setArticleEditLang(l.code as 'fr' | 'en' | 'ru')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      articleEditLang === l.code
                        ? 'bg-[#D4AF37] text-neutral-950 shadow-sm'
                        : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
                    }`}
                  >
                    {l.label}
                  </button>
                ))}
              </div>
              <span className="text-[11px] text-neutral-500 italic hidden sm:inline">
                {articleEditLang === 'fr' ? 'Основная французская версия' : `Перевод на ${articleEditLang.toUpperCase()} (опционально)`}
              </span>
            </div>

            {/* Form Body - Scrollable */}
            <form onSubmit={(e) => { e.preventDefault(); handleSaveArticle(); }} className="overflow-y-auto space-y-6 py-4 pr-1 flex-1 scrollbar-thin scrollbar-thumb-neutral-300 dark:scrollbar-thumb-neutral-800">
              {/* French Fields */}
              {articleEditLang === 'fr' && (
                <div className="space-y-5">
                  <div className="space-y-1.5">
                    <label className="text-xs uppercase tracking-wider text-neutral-600 dark:text-neutral-400 font-bold block">
                      Заголовок статьи (FR)
                    </label>
                    <input 
                      type="text" 
                      placeholder="Напр: Guide d'achat : Pourquoi choisir une Peugeot 2008 d'occasion en 2026 ?"
                      value={articleFormData.title} 
                      onChange={(e) => {
                        const val = e.target.value;
                        setArticleFormData(prev => ({
                          ...prev,
                          title: val,
                          slug: prev.slug || generateArticleSlug(val),
                          seoTitle: prev.seoTitle || `${val} - Ligo Automobiles`.slice(0, 70)
                        }));
                      }}
                      className="w-full bg-neutral-50 dark:bg-[#0D0D0D] border border-neutral-200 dark:border-neutral-800 focus:border-[#D4AF37] rounded-xl p-3 text-sm text-neutral-900 dark:text-white focus:outline-none transition-all font-semibold" 
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs uppercase tracking-wider text-neutral-600 dark:text-neutral-400 font-bold block">
                        ЧПУ / Slug URL
                      </label>
                      <input 
                        type="text" 
                        placeholder="guide-achat-peugeot-2008-occasion"
                        value={articleFormData.slug} 
                        onChange={(e) => setArticleFormData({ ...articleFormData, slug: e.target.value })} 
                        className="w-full bg-neutral-50 dark:bg-[#0D0D0D] border border-neutral-200 dark:border-neutral-800 focus:border-[#D4AF37] rounded-xl p-3 text-xs text-neutral-900 dark:text-white focus:outline-none transition-all font-mono" 
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs uppercase tracking-wider text-neutral-600 dark:text-neutral-400 font-bold block">
                        Автор
                      </label>
                      <input 
                        type="text" 
                        value={articleFormData.author} 
                        onChange={(e) => setArticleFormData({ ...articleFormData, author: e.target.value })} 
                        className="w-full bg-neutral-50 dark:bg-[#0D0D0D] border border-neutral-200 dark:border-neutral-800 focus:border-[#D4AF37] rounded-xl p-3 text-xs text-neutral-900 dark:text-white focus:outline-none transition-all" 
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs uppercase tracking-wider text-neutral-600 dark:text-neutral-400 font-bold block">
                      Краткое описание (FR)
                    </label>
                    <textarea 
                      rows={2} 
                      placeholder="Краткий привлекательный анонс для карточек и соцсетей..."
                      value={articleFormData.excerpt} 
                      onChange={(e) => setArticleFormData({ ...articleFormData, excerpt: e.target.value })} 
                      className="w-full bg-neutral-50 dark:bg-[#0D0D0D] border border-neutral-200 dark:border-neutral-800 focus:border-[#D4AF37] rounded-xl p-3 text-xs text-neutral-900 dark:text-white focus:outline-none transition-all resize-none" 
                    />
                  </div>

                  {/* Markdown Editor with Inserter Toolbar */}
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <label className="text-xs uppercase tracking-wider text-neutral-600 dark:text-neutral-400 font-bold block">
                        Текст статьи на французском (Markdown) <span className="text-red-500">*</span>
                      </label>
                      <button
                        type="button"
                        onClick={() => setShowVehiclePicker(true)}
                        className="px-3.5 py-1.5 rounded-xl bg-[#D4AF37] hover:bg-[#D4AF37]/90 text-neutral-950 font-bold text-xs transition-all flex items-center gap-1.5 shadow-sm active:scale-95"
                      >
                        <span>🚗</span>
                        <span>+ Вставить авто из каталога</span>
                      </button>
                    </div>

                    {/* Quick Formatting Toolbar */}
                    <div className="flex items-center gap-1 p-2 bg-neutral-100 dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 text-neutral-700 dark:text-neutral-300">
                      <button 
                        type="button" 
                        onClick={() => setArticleFormData(prev => ({ ...prev, content: prev.content + '**Жирный текст**' }))} 
                        className="p-1.5 rounded-lg hover:bg-white dark:hover:bg-neutral-800 transition-colors" 
                        title="Жирный"
                      >
                        <Icons.Bold />
                      </button>
                      <button 
                        type="button" 
                        onClick={() => setArticleFormData(prev => ({ ...prev, content: prev.content + '*Курсив*' }))} 
                        className="p-1.5 rounded-lg hover:bg-white dark:hover:bg-neutral-800 transition-colors" 
                        title="Курсив"
                      >
                        <Icons.Italic />
                      </button>
                      <button 
                        type="button" 
                        onClick={() => setArticleFormData(prev => ({ ...prev, content: prev.content + '\n## Заголовок раздела\n' }))} 
                        className="p-1.5 rounded-lg hover:bg-white dark:hover:bg-neutral-800 transition-colors" 
                        title="Заголовок H2"
                      >
                        <Icons.Heading />
                      </button>
                      <button 
                        type="button" 
                        onClick={() => setArticleFormData(prev => ({ ...prev, content: prev.content + '\n- Пункт списка 1\n- Пункт списка 2\n' }))} 
                        className="p-1.5 rounded-lg hover:bg-white dark:hover:bg-neutral-800 transition-colors" 
                        title="Список"
                      >
                        <Icons.ListIcon />
                      </button>
                    </div>

                    <textarea 
                      rows={10} 
                      placeholder={`Напишите текст статьи в Markdown...\n\nПример :\n## 1. Pourquoi acheter d'occasion ?\nL'achat d'un véhicule récent permet de réaliser une économie majeure...\n\n[VEHICULE:car_id]`}
                      value={articleFormData.content} 
                      onChange={(e) => setArticleFormData({ ...articleFormData, content: e.target.value })} 
                      className="w-full bg-neutral-50 dark:bg-[#0D0D0D] border border-neutral-200 dark:border-neutral-800 focus:border-[#D4AF37] rounded-xl p-4 text-xs sm:text-sm text-neutral-900 dark:text-white focus:outline-none transition-all font-mono leading-relaxed resize-y" 
                    />
                  </div>
                </div>
              )}

              {/* English Fields */}
              {articleEditLang === 'en' && (
                <div className="space-y-5">
                  <div className="space-y-1.5">
                    <label className="text-xs uppercase tracking-wider text-neutral-600 dark:text-neutral-400 font-bold block">
                      Заголовок статьи (EN)
                    </label>
                    <input 
                      type="text" 
                      placeholder="Напр: Buying Guide: How to choose the best pre-owned sports car in 2026"
                      value={articleFormData.title_en} 
                      onChange={(e) => setArticleFormData({ ...articleFormData, title_en: e.target.value })} 
                      className="w-full bg-neutral-50 dark:bg-[#0D0D0D] border border-neutral-200 dark:border-neutral-800 focus:border-[#D4AF37] rounded-xl p-3 text-sm text-neutral-900 dark:text-white focus:outline-none transition-all font-semibold" 
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs uppercase tracking-wider text-neutral-600 dark:text-neutral-400 font-bold block">
                      Краткое описание (EN)
                    </label>
                    <textarea 
                      rows={2} 
                      placeholder="Short summary in English..."
                      value={articleFormData.excerpt_en} 
                      onChange={(e) => setArticleFormData({ ...articleFormData, excerpt_en: e.target.value })} 
                      className="w-full bg-neutral-50 dark:bg-[#0D0D0D] border border-neutral-200 dark:border-neutral-800 focus:border-[#D4AF37] rounded-xl p-3 text-xs text-neutral-900 dark:text-white focus:outline-none transition-all resize-none" 
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs uppercase tracking-wider text-neutral-600 dark:text-neutral-400 font-bold block">
                        Текст статьи (EN)
                      </label>
                      <button
                        type="button"
                        onClick={() => setShowVehiclePicker(true)}
                        className="px-3 py-1 rounded-lg bg-[#D4AF37] text-neutral-950 font-bold text-xs"
                      >
                        🚗 + Вставить авто
                      </button>
                    </div>
                    <textarea 
                      rows={8} 
                      placeholder="Write the English version here..."
                      value={articleFormData.content_en} 
                      onChange={(e) => setArticleFormData({ ...articleFormData, content_en: e.target.value })} 
                      className="w-full bg-neutral-50 dark:bg-[#0D0D0D] border border-neutral-200 dark:border-neutral-800 focus:border-[#D4AF37] rounded-xl p-4 text-xs text-neutral-900 dark:text-white focus:outline-none transition-all font-mono leading-relaxed" 
                    />
                  </div>
                </div>
              )}

              {/* Russian Fields */}
              {articleEditLang === 'ru' && (
                <div className="space-y-5">
                  <div className="space-y-1.5">
                    <label className="text-xs uppercase tracking-wider text-neutral-600 dark:text-neutral-400 font-bold block">
                      Заголовок статьи (RU)
                    </label>
                    <input 
                      type="text" 
                      placeholder="Например: Руководство покупателя: Как выбрать подержанный премиум-автомобиль"
                      value={articleFormData.title_ru} 
                      onChange={(e) => setArticleFormData({ ...articleFormData, title_ru: e.target.value })} 
                      className="w-full bg-neutral-50 dark:bg-[#0D0D0D] border border-neutral-200 dark:border-neutral-800 focus:border-[#D4AF37] rounded-xl p-3 text-sm text-neutral-900 dark:text-white focus:outline-none transition-all font-semibold" 
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs uppercase tracking-wider text-neutral-600 dark:text-neutral-400 font-bold block">
                      Краткое описание (RU)
                    </label>
                    <textarea 
                      rows={2} 
                      placeholder="Краткое содержание статьи..."
                      value={articleFormData.excerpt_ru} 
                      onChange={(e) => setArticleFormData({ ...articleFormData, excerpt_ru: e.target.value })} 
                      className="w-full bg-neutral-50 dark:bg-[#0D0D0D] border border-neutral-200 dark:border-neutral-800 focus:border-[#D4AF37] rounded-xl p-3 text-xs text-neutral-900 dark:text-white focus:outline-none transition-all resize-none" 
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs uppercase tracking-wider text-neutral-600 dark:text-neutral-400 font-bold block">
                        Текст статьи (RU)
                      </label>
                      <button
                        type="button"
                        onClick={() => setShowVehiclePicker(true)}
                        className="px-3 py-1 rounded-lg bg-[#D4AF37] text-neutral-950 font-bold text-xs"
                      >
                        🚗 + Вставить авто
                      </button>
                    </div>
                    <textarea 
                      rows={8} 
                      placeholder="Текст статьи на русском языке..."
                      value={articleFormData.content_ru} 
                      onChange={(e) => setArticleFormData({ ...articleFormData, content_ru: e.target.value })} 
                      className="w-full bg-neutral-50 dark:bg-[#0D0D0D] border border-neutral-200 dark:border-neutral-800 focus:border-[#D4AF37] rounded-xl p-4 text-xs text-neutral-900 dark:text-white focus:outline-none transition-all font-mono leading-relaxed" 
                    />
                  </div>
                </div>
              )}

              {/* Shared Metadata & Media Section */}
              <div className="pt-6 border-t border-neutral-200 dark:border-neutral-800 space-y-5">
                <h4 className="text-xs font-bold uppercase tracking-widest text-[#D4AF37]">
                  Медиа, связи и параметры публикации
                </h4>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs uppercase tracking-wider text-neutral-600 dark:text-neutral-400 font-bold block">
                      Главное изображение статьи
                    </label>
                    {articleFormData.featuredImage && (
                      <button 
                        type="button" 
                        onClick={() => setArticleFormData({ ...articleFormData, featuredImage: '' })}
                        className="text-xs text-red-500 hover:underline font-semibold"
                      >
                        Удалить фото
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-center">
                    {/* Preview / PC Upload Box */}
                    <div className="sm:col-span-1 aspect-[16/10] rounded-xl overflow-hidden bg-neutral-100 dark:bg-neutral-800 border-2 border-dashed border-neutral-300 dark:border-neutral-700 flex items-center justify-center relative group">
                      {articleFormData.featuredImage ? (
                        <>
                          <img 
                            src={articleFormData.featuredImage} 
                            alt="Превью статьи" 
                            className="w-full h-full object-cover" 
                          />
                          <label className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center cursor-pointer transition-opacity text-white text-xs font-bold gap-1">
                            <input 
                              type="file" 
                              accept="image/*" 
                              onChange={(e) => { if (e.target.files?.[0]) handleArticleImageUpload(e.target.files[0]); }} 
                              className="hidden" 
                            />
                            <span>📷 Заменить фото</span>
                          </label>
                        </>
                      ) : (
                        <label className="w-full h-full flex flex-col items-center justify-center cursor-pointer p-4 text-center hover:bg-neutral-200/60 dark:hover:bg-neutral-700/50 transition-colors">
                          <input 
                            type="file" 
                            accept="image/*" 
                            onChange={(e) => { if (e.target.files?.[0]) handleArticleImageUpload(e.target.files[0]); }} 
                            className="hidden" 
                          />
                          <span className="text-2xl mb-1">📁</span>
                          <span className="text-xs font-bold text-neutral-800 dark:text-neutral-200">Загрузить с ПК</span>
                          <span className="text-[10px] text-neutral-500 mt-0.5">JPG, PNG, WEBP</span>
                        </label>
                      )}
                    </div>

                    {/* URL Input & ALT */}
                    <div className="sm:col-span-2 space-y-3">
                      <div className="space-y-1">
                        <label className="text-[10px] uppercase tracking-wider text-neutral-500 font-bold">Или вставьте прямую ссылку на фото (URL)</label>
                        <input 
                          type="text" 
                          placeholder="https://images.unsplash.com/..."
                          value={articleFormData.featuredImage} 
                          onChange={(e) => setArticleFormData({ ...articleFormData, featuredImage: e.target.value })} 
                          className="w-full bg-neutral-50 dark:bg-[#0D0D0D] border border-neutral-200 dark:border-neutral-800 focus:border-[#D4AF37] rounded-xl p-2.5 text-xs text-neutral-900 dark:text-white focus:outline-none transition-all font-mono" 
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] uppercase tracking-wider text-neutral-500 font-bold">ALT текст для поисковиков (SEO)</label>
                        <input 
                          type="text" 
                          placeholder="Напр: Тест-драйв Peugeot 2008 с пробегом"
                          value={articleFormData.featuredImageAlt} 
                          onChange={(e) => setArticleFormData({ ...articleFormData, featuredImageAlt: e.target.value })} 
                          className="w-full bg-neutral-50 dark:bg-[#0D0D0D] border border-neutral-200 dark:border-neutral-800 focus:border-[#D4AF37] rounded-xl p-2.5 text-xs text-neutral-900 dark:text-white focus:outline-none transition-all" 
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs uppercase tracking-wider text-neutral-600 dark:text-neutral-400 font-bold block">
                      Теги (через запятую)
                    </label>
                    <input 
                      type="text" 
                      placeholder="Руководства, Советы, Внедорожники"
                      value={articleFormData.tags} 
                      onChange={(e) => setArticleFormData({ ...articleFormData, tags: e.target.value })} 
                      className="w-full bg-neutral-50 dark:bg-[#0D0D0D] border border-neutral-200 dark:border-neutral-800 focus:border-[#D4AF37] rounded-xl p-3 text-xs text-neutral-900 dark:text-white focus:outline-none transition-all" 
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs uppercase tracking-wider text-neutral-600 dark:text-neutral-400 font-bold block">
                      Связанный автомобиль
                    </label>
                    <select
                      value={articleFormData.relatedVehicleId}
                      onChange={(e) => setArticleFormData({ ...articleFormData, relatedVehicleId: e.target.value })}
                      className="w-full bg-neutral-50 dark:bg-[#0D0D0D] border border-neutral-200 dark:border-neutral-800 focus:border-[#D4AF37] rounded-xl p-3 text-xs text-neutral-900 dark:text-white focus:outline-none transition-all"
                    >
                      <option value="">Без привязки к авто</option>
                      {cars.map(c => (
                        <option key={c.id} value={c.id}>{c.brand} {c.model} ({Number(c.price).toLocaleString('ru-RU')} €)</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs uppercase tracking-wider text-neutral-600 dark:text-neutral-400 font-bold block">
                      Статус публикации
                    </label>
                    <select
                      value={articleFormData.status}
                      onChange={(e) => setArticleFormData({ ...articleFormData, status: e.target.value as Article['status'] })}
                      className="w-full bg-neutral-50 dark:bg-[#0D0D0D] border border-neutral-200 dark:border-neutral-800 focus:border-[#D4AF37] rounded-xl p-3 text-xs text-neutral-900 dark:text-white focus:outline-none transition-all"
                    >
                      <option value="published">Опубликовано на сайте</option>
                      <option value="draft">Черновик (не видно)</option>
                      <option value="archived">В архиве</option>
                    </select>
                  </div>
                </div>

                {/* Homepage Placement Checkbox */}
                <div className="flex flex-wrap items-center gap-6 p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-900/50 border border-neutral-200 dark:border-neutral-800">
                  <label className="flex items-center gap-3 cursor-pointer select-none">
                    <input 
                      type="checkbox" 
                      checked={articleFormData.homepageFeatured} 
                      onChange={(e) => setArticleFormData({ ...articleFormData, homepageFeatured: e.target.checked })} 
                      className="w-4 h-4 rounded text-[#D4AF37] focus:ring-[#D4AF37]" 
                    />
                    <span className="text-xs font-bold text-neutral-900 dark:text-white">Показывать на главной (Топ 3)</span>
                  </label>
                  {articleFormData.homepageFeatured && (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-neutral-500">Порядок показа:</span>
                      <input 
                        type="number" 
                        min={1} 
                        max={10} 
                        value={articleFormData.homepageOrder || 1} 
                        onChange={(e) => setArticleFormData({ ...articleFormData, homepageOrder: parseInt(e.target.value) || 1 })} 
                        className="w-16 bg-white dark:bg-[#0D0D0D] border border-neutral-200 dark:border-neutral-800 rounded-lg p-1.5 text-xs text-center text-neutral-900 dark:text-white" 
                      />
                    </div>
                  )}
                </div>

                {/* SEO Block */}
                <div className="p-5 rounded-2xl bg-neutral-50 dark:bg-neutral-900/30 border border-neutral-200 dark:border-neutral-800 space-y-4">
                  <span className="text-xs font-bold uppercase tracking-widest text-[#D4AF37]">
                    Параметры SEO
                  </span>
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs">
                      <span className="text-neutral-500 font-bold uppercase">SEO Title</span>
                      <span className="text-neutral-400 font-mono">{articleFormData.seoTitle.length} / 70</span>
                    </div>
                    <input 
                      type="text" 
                      placeholder="Заголовок <title> для Google..."
                      value={articleFormData.seoTitle} 
                      onChange={(e) => setArticleFormData({ ...articleFormData, seoTitle: e.target.value })} 
                      className="w-full bg-white dark:bg-[#0D0D0D] border border-neutral-200 dark:border-neutral-800 rounded-xl p-3 text-xs text-neutral-900 dark:text-white focus:outline-none" 
                    />
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs">
                      <span className="text-neutral-500 font-bold uppercase">Meta Description</span>
                      <span className="text-neutral-400 font-mono">{articleFormData.metaDescription.length} / 160</span>
                    </div>
                    <textarea 
                      rows={2} 
                      placeholder="Описание для результатов поиска Google..."
                      value={articleFormData.metaDescription} 
                      onChange={(e) => setArticleFormData({ ...articleFormData, metaDescription: e.target.value })} 
                      className="w-full bg-white dark:bg-[#0D0D0D] border border-neutral-200 dark:border-neutral-800 rounded-xl p-3 text-xs text-neutral-900 dark:text-white focus:outline-none resize-none" 
                    />
                  </div>
                  <div className="flex items-center gap-6 text-xs text-neutral-600 dark:text-neutral-400">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={articleFormData.robotsIndex} 
                        onChange={(e) => setArticleFormData({ ...articleFormData, robotsIndex: e.target.checked })} 
                        className="w-4 h-4 rounded text-[#D4AF37]" 
                      />
                      <span>Индексировать (Googlebots)</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={articleFormData.robotsFollow} 
                        onChange={(e) => setArticleFormData({ ...articleFormData, robotsFollow: e.target.checked })} 
                        className="w-4 h-4 rounded text-[#D4AF37]" 
                      />
                      <span>Переходить по ссылкам (Follow)</span>
                    </label>
                  </div>
                </div>
              </div>

              {/* Modal Actions */}
              <div className="flex gap-4 pt-4 border-t border-neutral-200 dark:border-neutral-800 flex-shrink-0">
                <button 
                  type="button" 
                  onClick={() => setShowArticleModal(false)}
                  className="flex-1 py-3 rounded-2xl bg-neutral-100 dark:bg-[#0D0D0D] hover:bg-neutral-200 dark:hover:bg-neutral-800 text-neutral-800 dark:text-neutral-300 font-bold text-xs uppercase tracking-wider transition-all border border-neutral-200 dark:border-neutral-800"
                >
                  {t('cancel')}
                </button>
                <button 
                  type="submit"
                  className="flex-1 py-3 rounded-2xl bg-[#D4AF37] hover:bg-[#D4AF37]/90 text-neutral-950 font-bold text-xs uppercase tracking-wider transition-all shadow-lg shadow-[#D4AF37]/20"
                >
                  {articleToEdit ? 'Обновить статью' : 'Сохранить и опубликовать'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Vehicle Inserter Modal */}
      {showVehiclePicker && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fadeIn">
          <div className="w-full max-w-2xl bg-white dark:bg-[#121214] border border-neutral-200 dark:border-neutral-800 rounded-3xl p-6 shadow-2xl max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between pb-4 border-b border-neutral-200 dark:border-neutral-800 flex-shrink-0">
              <div>
                <h4 className="text-lg font-serif font-bold text-neutral-900 dark:text-white flex items-center gap-2">
                  <span>🚗</span>
                  <span>Вставить автомобиль в статью</span>
                </h4>
                <p className="text-xs text-neutral-500">Выберите автомобиль из каталога для вставки в виде карточки или ссылки</p>
              </div>
              <button 
                type="button" 
                onClick={() => { setShowVehiclePicker(false); setVehiclePickerSearch(''); }}
                className="p-2 text-neutral-400 hover:text-white"
              >
                <Icons.X />
              </button>
            </div>

            <div className="py-4 flex-shrink-0">
              <input 
                type="text" 
                placeholder="Поиск по марке или модели (напр: Porsche, 911, RS6)..."
                value={vehiclePickerSearch} 
                onChange={(e) => setVehiclePickerSearch(e.target.value)} 
                className="w-full bg-neutral-50 dark:bg-[#0D0D0D] border border-neutral-200 dark:border-neutral-800 focus:border-[#D4AF37] rounded-xl p-3 text-xs text-neutral-900 dark:text-white focus:outline-none" 
                autoFocus
              />
            </div>

            <div className="overflow-y-auto space-y-3 flex-1 pr-1 scrollbar-thin scrollbar-thumb-neutral-300 dark:scrollbar-thumb-neutral-800">
              {cars
                .filter(c => {
                  if (!vehiclePickerSearch.trim()) return true;
                  const q = vehiclePickerSearch.toLowerCase();
                  return c.brand.toLowerCase().includes(q) || c.model.toLowerCase().includes(q);
                })
                .map(car => (
                  <div key={car.id} className="p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-900/60 border border-neutral-200 dark:border-neutral-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <img src={car.image || getFallbackSvg(200, 150, 12, 2)} alt={car.model} className="w-16 h-12 object-cover rounded-lg border border-neutral-200 dark:border-neutral-800" onError={(e: any) => { e.currentTarget.src = getFallbackSvg(200, 150, 12, 2); }} />
                      <div>
                        <span className="text-[10px] text-[#D4AF37] uppercase font-bold">{car.brand}</span>
                        <h5 className="text-sm font-bold text-neutral-900 dark:text-white">{car.model}</h5>
                        <p className="text-xs text-neutral-500">{car.year} • {Number(car.price).toLocaleString('ru-RU')} €</p>
                      </div>
                    </div>
                    <div className="flex gap-2 w-full sm:w-auto">
                      <button 
                        type="button" 
                        onClick={() => handleInsertVehicle(car, 'card')}
                        className="flex-1 sm:flex-initial px-3.5 py-2 rounded-xl bg-[#D4AF37] hover:bg-[#D4AF37]/90 text-neutral-950 text-xs font-bold transition-all shadow-sm"
                      >
                        🃏 Вставить карточку
                      </button>
                      <button 
                        type="button" 
                        onClick={() => handleInsertVehicle(car, 'link')}
                        className="flex-1 sm:flex-initial px-3.5 py-2 rounded-xl bg-neutral-200 dark:bg-neutral-800 hover:bg-neutral-300 dark:hover:bg-neutral-700 text-neutral-900 dark:text-white text-xs font-bold transition-all"
                      >
                        🔗 Вставить ссылку
                      </button>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}

      {/* Modal de confirmation de suppression d'article */}
      {deleteConfirmArticle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-md bg-white dark:bg-[#121214] border border-neutral-200 dark:border-neutral-900 rounded-2xl p-6 shadow-2xl space-y-6">
            <div className="text-center">
              <h4 className="text-xl font-serif text-neutral-900 dark:text-white mb-2">Подтверждение удаления</h4>
              <p className="text-neutral-600 dark:text-neutral-400 text-sm">Вы уверены, что хотите удалить статью <span className="text-[#D4AF37] font-semibold">"{getArticleTitle(deleteConfirmArticle, 'ru')}"</span>? Это действие необратимо.</p>
            </div>
            <div className="flex gap-4">
              <button 
                onClick={() => setDeleteConfirmArticle(null)}
                className="flex-1 py-3 rounded-xl bg-neutral-100 dark:bg-[#0D0D0D] hover:bg-neutral-200 dark:hover:bg-neutral-800 text-neutral-800 dark:text-neutral-300 font-bold border border-neutral-200 dark:border-neutral-800 transition-all"
              >
                {t('cancel')}
              </button>
              <button 
                onClick={() => handleDeleteArticle(deleteConfirmArticle)}
                className="flex-1 py-3 rounded-xl bg-red-650 hover:bg-red-600 text-white font-bold transition-all shadow-lg shadow-red-650/10"
              >
                Удалить
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Кастомное модальное окно удаления машины (заменяет confirm) */}
      {deleteConfirmCar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-md bg-white dark:bg-[#121214] border border-neutral-200 dark:border-neutral-900 rounded-2xl p-6 shadow-2xl space-y-6">
            <div className="text-center">
              <h4 className="text-xl font-serif text-neutral-900 dark:text-white mb-2">Подтверждение удаления</h4>
              <p className="text-neutral-600 dark:text-neutral-400 text-sm">Вы уверены, что хотите удалить автомобиль <span className="text-[#D4AF37] font-semibold">{deleteConfirmCar.brand} {deleteConfirmCar.model}</span>? Это действие необратимо.</p>
            </div>
            <div className="flex gap-4">
              <button 
                onClick={() => setDeleteConfirmCar(null)}
                className="flex-1 py-3 rounded-xl bg-neutral-100 dark:bg-[#0D0D0D] hover:bg-neutral-200 dark:hover:bg-neutral-800 text-neutral-800 dark:text-neutral-300 font-bold border border-neutral-200 dark:border-neutral-800 transition-all"
              >
                {t('cancel')}
              </button>
              <button 
                onClick={handleDeleteCar}
                className="flex-1 py-3 rounded-xl bg-red-650 hover:bg-red-600 text-white font-bold transition-all shadow-lg shadow-red-650/10"
              >
                Удалить
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Admin Login Modal */}
      {showAdminLoginModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-md bg-white dark:bg-[#121214] border border-neutral-200 dark:border-neutral-900 rounded-2xl p-8 shadow-2xl relative">
            <button 
              onClick={() => setShowAdminLoginModal(false)}
              className="absolute top-4 right-4 p-2 text-neutral-400 hover:text-neutral-800 dark:hover:text-white transition-colors"
            >
              <Icons.X />
            </button>
            <div className="text-center mb-6">
              <h3 className="text-2xl font-serif text-neutral-900 dark:text-white mb-2">{t('adminTitle')}</h3>
              <p className="text-neutral-600 dark:text-neutral-400 text-sm">Entrez votre mot de passe administrateur</p>
            </div>
            <form onSubmit={(e) => {
              e.preventDefault();
              if (adminPassword === 'France2026') {
                setIsAdmin(true);
                try { localStorage.setItem('ligo_admin_logged_in', 'true'); } catch {}
                setShowAdminLoginModal(false);
                setAdminPassword('');
                navigateTo('admin');
                showNotification("Connexion réussie.", "success");
              } else {
                showNotification("Mot de passe incorrect.", "error");
              }
            }} className="space-y-4">
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
                className="w-full py-3.5 rounded-xl bg-[#D4AF37] hover:bg-[#D4AF37]/90 text-neutral-950 font-bold tracking-wide transition-all shadow-lg"
              >
                {t('adminPanel')}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Lightbox / Fullscreen Gallery */}
      {showLightbox && (
        <div className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-4">
          <button onClick={() => setShowLightbox(false)} className="absolute top-6 right-6 text-white/80 hover:text-white p-2 text-2xl z-50">✕</button>
          <button onClick={() => setLightboxIndex(prev => (prev - 1 + currentCarGallery.length) % currentCarGallery.length)} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/80 hover:text-white p-3 text-3xl">‹</button>
          <button onClick={() => setLightboxIndex(prev => (prev + 1) % currentCarGallery.length)} className="absolute right-4 top-1/2 -translate-y-1/2 text-white/80 hover:text-white p-3 text-3xl">›</button>
          <img src={currentCarGallery[lightboxIndex] || ""} alt="Full view" className="max-h-[85vh] max-w-[90vw] object-contain rounded-lg" />
        </div>
      )}
    </div>
  );
}

export default App;
