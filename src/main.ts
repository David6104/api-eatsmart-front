import './style.css';

interface ArticleDTO {
  idArticle: string;
  nomArticle: string;
  ingredientsArticle: string | null;
  quantiteArticle: string | null;
  PrixArticle: string;
}

async function chargerMessageDuJour(): Promise<string> {
  const res = await fetch("https://jsonplaceholder.typicode.com/todos/1"); // besoin 3 : permet de recueprer le message du jour via le lien de l'API
  const data = await res.json();
  return data.title; 
}

function genererPlatHTML(art: ArticleDTO): string {
  let nomAffiche = art.nomArticle;

  if (art.quantiteArticle !== null) {
    nomAffiche = `${art.nomArticle} ${parseInt(art.quantiteArticle)}cm`;
  }
  
  const prix = parseFloat(art.PrixArticle); // besoin 2 : convertir le prix en string en nombre flottant
  const badgeBonPlan = prix < 10 ? `<span class="badge-bon-plan">🔥 Bon Plan</span>` : ""; // besoin 2 : si le prix est inferieur a 10 alors afficher bon plan

  return `
    <div class="card">
      <h3>${nomAffiche}</h3>
      <p>${art.ingredientsArticle ?? ""}</p>
      <p><strong>Prix : ${art.PrixArticle}€</strong></p>
      <p>${badgeBonPlan}</p>
      <button type="button" class="btn-order">Ajouter</button>
    </div>
  `;
}

// besoin 1 : fonction qui va compter les plats dynamiquement
function mettreAJourCompteur() {
  const compteur = document.querySelector<HTMLHeadingElement>('#compteur-plats');
  const nbPlats = document.querySelectorAll('.card').length;

  if (compteur) {
    compteur.textContent = `(${nbPlats} plats)`;
  }
}

async function chargerDonnees(): Promise<ArticleDTO[]> {
  const res = await fetch('http://localhost/David-api-eatsmart/articles');
  return await res.json();
}

//  tableau qui stocke les plats sélectionnés
const panier: ArticleDTO[] = [];


function mettreAJourPanier() {
  // elements HTML ou on va injecter les données
  const cartItemsDiv = document.querySelector<HTMLDivElement>('#cart-items');
  const totalPrixSpan = document.querySelector<HTMLSpanElement>('#total-prix');

  if (cartItemsDiv && totalPrixSpan) {
    // si le panier est vide on remet le texte par défaut
    if (panier.length === 0) {
      cartItemsDiv.innerHTML = '<p>Votre panier est vide</p>';
      totalPrixSpan.textContent = '0.00';
    } else {
      // besoin 6 : Affichage dynamique via un .map()
      cartItemsDiv.innerHTML = panier.map(art => `
        <div class="cart-item">
          <span>${art.nomArticle}</span>
          <span>${parseFloat(art.PrixArticle).toFixed(2)}€</span>
        </div>
      `).join('');

      // besoin 7 : Calcul et affichage du total
      let total = 0;
      for (const art of panier) {
        total += parseFloat(art.PrixArticle);
      }
      
      // on utilise toFixed(2) pour forcer les 2 chiffres après la virgule
      totalPrixSpan.textContent = total.toFixed(2);
    }
  }
}

async function init() {
  console.log("Chargement du menu");

  const menuData = await chargerDonnees();
  const messageDuJour = await chargerMessageDuJour(); // besoin 3 :mettre dans une variable le message du jour

  console.log("Données reçues :", menuData);
  console.log("Message du jour :", messageDuJour);

  const appDiv = document.querySelector<HTMLDivElement>('#app');

  if (appDiv) {// besoins 1 et 3 : affiche dans le header le nombres de plats et le message du jour
    appDiv.innerHTML = `
      <header>
        <h1> EatSmart - Carte du Restaurant <strong id="compteur-plats"> </strong> </h1>
        <p id="message-jour">Message du jour : ${messageDuJour}</p>
      </header>

       <div class="content-wrapper">
        <main class="menu-container">
          ${menuData.map((art) => genererPlatHTML(art)).join('')}
        </main>

        <aside class="cart-container">
          <h2>Votre Panier</h2>
          <div id="cart-items">
            <p>Votre panier est vide</p>
          </div>
          <hr>
          <div class="cart-total">
            <strong>Total : <span id="total-prix">0.00</span>€</strong>
          </div>
          <div style="margin-top: 15px; display: flex; gap: 10px;">
            <button type="button" class="btn-clear" >Vider</button>
            <button type="button" class="btn-validate">Valider la commande</button>
          </div>
        </aside>
      </div>
    `;
    
    mettreAJourCompteur();
    
    const tousLesBoutons = document.querySelectorAll<HTMLButtonElement>('.btn-order');
    tousLesBoutons.forEach((btn, index) => {
      btn.addEventListener('click', () => {
        const plat = menuData[index];
        console.log(`Bouton n°${index} cliqué ! Plat : ${plat.nomArticle}`);
        
        // Ajout du plat au panier
        panier.push(plat); 
        console.log("État du panier :", panier); 
        
       
        mettreAJourPanier(); 
      });
    });

    // IMPLEMENTATION DES DETECTEURS DE CLICS POUR LES DEUX NOUVEAUX BOUTONS
    const boutonVider = document.querySelector<HTMLButtonElement>('.btn-clear');
    const boutonValider = document.querySelector<HTMLButtonElement>('.btn-validate');

    // Action : Vider le panier
    boutonVider?.addEventListener('click', () => {
      panier.length = 0; // Vide le tableau sans casser la constante
      mettreAJourPanier(); // Force la mise à jour visuelle du panier
    });

    // Action : Valider la commande (Envoi POST vers l'API PHP)
    boutonValider?.addEventListener('click', async () => {
      if (panier.length === 0) return; // Empêche d'envoyer une commande vide

      // 1. Calcul du total exact
      let total = 0;
      for (const art of panier) {
        total += parseFloat(art.PrixArticle);
      }

      // 2. Regroupement par ID et calcul des quantités pour l'API assoc_article_commande
      const quantites: { [key: string]: number } = {};
      panier.forEach(art => {
        quantites[art.idArticle] = (quantites[art.idArticle] || 0) + 1;
      });

      const articlesFormates = Object.keys(quantites).map(id => ({
        id_article: parseInt(id),
        quantite: quantites[id]
      }));

      // 3. Préparation de l'objet JSON requis par CommandeController.php
      const commandeBody = {
        id_commande: Math.floor(Math.random() * 100000), // ID unique aléatoire
        date_commande: new Date().toISOString().slice(0, 10), // Format MySQL YYYY-MM-DD
        prix_total: total,
        etat: "en cours",
        articles: articlesFormates
      };

      try {
        const response = await fetch('http://localhost/David-api-eatsmart/commandes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(commandeBody)
        });

        if (response.ok) {
          panier.length = 0; // Vide le panier après le succès
          mettreAJourPanier(); // Réinitialise l'affichage

          // Affiche un message de confirmation à la place du texte du panier
          const cartItemsDiv = document.querySelector<HTMLDivElement>('#cart-items');
          if (cartItemsDiv) {
            cartItemsDiv.innerHTML = '<p>Commande envoyée en cuisine !</p>';
          }
        }
      } catch (error) {
        console.error("Erreur lors de l'envoi de la commande :", error);
      }
    });
  }
}

init();