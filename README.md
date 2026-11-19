# OSO_CONVENTION

Agenda statique des événements geek, médiévaux et cosplay en France, adapté de [Quel_Conv](https://github.com/jmnioso/Quel_Conv) (révision source `da28c18`). La charte papier, les typographies, les couleurs et les cartes en forme de billets sont conservées.

Aucune base de données, clé API, connexion ou page d’administration. Le navigateur charge directement `data/events.json`. Aucun outil de compilation ni dépendance JavaScript à installer.

## Démarrer

```sh
python3 -m http.server 8000
```

Ouvrir http://localhost:8000. Utiliser un serveur HTTP : les navigateurs bloquent habituellement le chargement JSON depuis une URL `file://`.

## Fichiers

- `index.html` : page de l’agenda.
- `styles.css` : charte graphique et adaptation mobile.
- `app.js` : chargement, recherche, filtres, tri et fiches détaillées.
- `data/events.json` : **source unique de tous les événements**.
- `tests/run.mjs` : validation des données et régressions fonctionnelles.

## Mettre à jour l’agenda

Modifier `data/events.json` dans GitHub, puis enregistrer le changement. Mettre à jour `updated_at` en tête du fichier et `verified_at` sur les fiches vérifiées. Une modification publiée est prise en compte au prochain chargement de la page.

Chaque événement contient :

```json
{
  "id": "mon-evenement-2027",
  "title": "Mon événement 2027",
  "category": "geek",
  "tags": ["geek", "cosplay"],
  "date_start": "2027-06-12",
  "date_end": "2027-06-13",
  "location_city": "Ville",
  "location_name": "Lieu de l’événement",
  "location_address": "",
  "description": "Présentation courte et factuelle.",
  "price": "Voir le site officiel",
  "organizer": "",
  "website": "https://exemple.fr/",
  "source_url": "https://exemple.fr/annonce",
  "verified_at": "2026-11-19"
}
```

- Catégories et tags acceptés : `geek`, `medieval`, `cosplay`. Les tags permettent à une convention de figurer dans plusieurs filtres.
- Identifiant unique en minuscules, chiffres et tirets. Dates au format `AAAA-MM-JJ` ; pour un jour unique, début et fin identiques.
- Un événement reste visible jusqu’à sa date de fin incluse. Le bouton « événements passés » permet ensuite de le retrouver sans le supprimer du JSON.
- Pour plusieurs week-ends séparés, créer une entrée par période : ne pas inclure les jours de fermeture.
- Vérifier les dates sur une annonce officielle ; ne pas extrapoler une édition annuelle. Laisser un champ facultatif vide lorsque l’information n’est pas publiée.

## Catalogue initial

23 entrées vérifiées le **19 novembre 2026**, de novembre 2026 à octobre 2027 : Geek Life, TGS Toulouse, Japan Touch, TGF Tarbes, Japan Manga Wave, Angers Geekfest, Japan Expo, marchés médiévaux de Noël de Provins et Ribeauvillé, Biot et les Templiers et Médiévales de Provins. Il s’agit d’une sélection non exhaustive, à entretenir dans le JSON. Les dates et tarifs peuvent évoluer.

Chaque fiche porte sa propre source et sa date de vérification, également visibles dans le site. Exemples de sources : [Geek Life](https://www.geeklife.fr/), [Japan Manga Wave](https://japanmangawave.com/), [Médiévales de Provins](https://provins-medievales.com/), [Ville de Biot](https://www.biot.fr/appel-a-candidatures-pour-le-marche-medieval-de-biot-et-les-templiers-2027).

## Vérifier

Avec Node.js 20 ou supérieur, sans installation de paquets :

```sh
node --check app.js
node tests/run.mjs
```

Les tests couvrent la cohérence du catalogue, les événements en cours, les fuseaux horaires, les filtres combinés, le tri, le chargement en échec, les fiches et l’échappement des contenus.

## Héberger sur GitHub Pages

Dans **Settings → Pages**, choisir **Deploy from a branch**, branche `main`, dossier `/ (root)`. Le site est alors disponible à https://jmnioso.github.io/OSO_CONVENTION/.

Les fichiers peuvent aussi être servis par tout hébergeur statique. Les seules ressources tierces chargées par la page sont les polices Google Fonts ; une police monospace locale prend le relais si elles sont indisponibles.
