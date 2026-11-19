# OSO_CONVENTION

Agenda statique des événements geek, médiévaux cosplay et rencontres avec des acteurs en Europe, adapté de [Quel_Conv](https://github.com/jmnioso/Quel_Conv) (révision source `da28c18`). La charte papier, les typographies, les couleurs et les cartes en forme de billets sont conservées.

Aucune base de données, clé API, connexion ou page d’administration. Le navigateur charge directement `data/events.json`. Aucun outil de compilation ni dépendance JavaScript à installer.

## Démarrer

```sh
python3 -m http.server 8000
```

Ouvrir http://localhost:8000. Utiliser un serveur HTTP : les navigateurs bloquent habituellement le chargement JSON depuis une URL `file://`.

## Fichiers

- `index.html` : page de l’agenda.
- `styles.css` : charte graphique et adaptation mobile.
- `app.js` : recherche, filtres, favoris, calendrier, carte, export ICS et fiches détaillées.
- `assets/` : illustrations originales de catégorie utilisées en remplacement des visuels absents.
- `data/europe.json` : fond de carte local Natural Earth (domaine public).
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
  "location_country": "France",
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

- Catégories et tags acceptés : `geek`, `medieval`, `cosplay`, `rencontre-acteur`. Les tags permettent à une convention de figurer dans plusieurs filtres.
- Identifiant unique en minuscules, chiffres et tirets. Dates au format `AAAA-MM-JJ` ; pour un jour unique, début et fin identiques.
- Un événement reste visible jusqu’à sa date de fin incluse. Le bouton « événements passés » permet ensuite de le retrouver sans le supprimer du JSON.
- Pour plusieurs week-ends séparés, créer une entrée par période : ne pas inclure les jours de fermeture.
- Vérifier les dates sur une annonce officielle ; ne pas extrapoler une édition annuelle. Laisser un champ facultatif vide lorsque l’information n’est pas publiée.

## Catalogue européen 2026–2027

102 entrées dans 14 pays, vérifiées le **19 novembre 2026**. Cette sélection couvre les dates publiées retrouvées ; elle ne prétend pas recenser tous les événements européens ni toutes les éditions 2027.

Priorités intégrées : Comic Con (dont France, Londres, Birmingham, Liverpool, Bruxelles, Utrecht, Prague, Bâle, Stockholm), Yggdrasil Indoor 2026/2027, Fort Fort Lointain 2026, les deux week-ends de L’Étrange Noël des Sorciers 2026, Normannia 2026/2027, Geek Life et TGS. La catégorie **Rencontre Acteur** inclut Dream It, People Conventions, FedCon et les conventions spécialisées de WE LOVE CONVENTIONS.

Chaque fiche contient une source de date, un lien de visite et une date de vérification. Les sources sont principalement les organisateurs et lieux d’accueil ; quelques archives 2026 utilisent Roster Con ou un exposant participant. Les dates 2027 ne sont jamais déduites des éditions précédentes. Les lieux précis non vérifiés et les tarifs sont laissés vides ou renvoient au site officiel.

Le tableau `pending_editions` du même JSON conserve les éditions prioritaires encore sans date confirmée et les contradictions à résoudre. Ces lignes ne sont pas des événements datés et ne sont pas affichées dans l’agenda. Cela concerne notamment Yggdrasil extérieur/Noël 2027, TGS 2027, Dream It 2027 et MCM Londres automne 2027. Ce suivi est manuel ; aucun robot ni mise à jour automatique n’est configuré.

Les filtres pays, année et catégorie se combinent avec la recherche. Pour parcourir toute l’année 2026, activer aussi **Voir les événements passés** et laisser la date de début vide. Les statistiques concernent toujours les événements à venir du catalogue entier.

## Vérifier

Avec Node.js 20 ou supérieur, sans installation de paquets :

```sh
node --check app.js
node tests/run.mjs
```

Les tests couvrent la cohérence du catalogue, les événements en cours, les fuseaux horaires, les filtres combinés, le tri, le chargement en échec, les fiches et l’échappement des contenus.

## Héberger sur GitHub Pages

Dans **Settings → Pages**, choisir **Deploy from a branch**, branche `main`, dossier `/ (root)`. Le site est alors disponible à https://jmnioso.github.io/OSO_CONVENTION/.

Les fichiers peuvent aussi être servis par tout hébergeur statique. La page charge les polices Google Fonts et certains visuels hébergés par les organisateurs. Des polices locales et illustrations de catégorie prennent le relais en cas d’indisponibilité. La carte fonctionne sans service cartographique externe.


## Navigation et invités

Les vues liste, calendrier mensuel et carte partagent les filtres. La carte regroupe les événements par pays : ses repères ne représentent pas les adresses des salles. Les raccourcis « Ce week-end » et « Mois prochain » utilisent la date locale du navigateur. Les favoris sont enregistrés uniquement dans ce navigateur, sans compte ni synchronisation. L’export `.ics` couvre tous les jours de l’événement et peut être importé dans un agenda.

Les rubans d’invités sont repliés par défaut. Six noms au maximum apparaissent sur la carte ; la fiche détaillée donne toute la sélection enregistrée. La recherche porte aussi sur les noms et rôles des invités. Sans liste renseignée, un lien invite à consulter le site officiel. Les annonces changent : leur actualisation reste manuelle.

Champs facultatifs d’un événement :

```json
{
  "guests": [{
    "name": "Nom public de l’invité",
    "known_for": "Série, rôle ou activité",
    "days": ["2027-06-12"],
    "source_url": "https://exemple.fr/invites",
    "verified_at": "2026-11-19"
  }],
  "guests_source_url": "https://exemple.fr/invites",
  "guests_verified_at": "2026-11-19",
  "guests_complete": false,
  "ticket_url": "https://exemple.fr/billetterie",
  "image": {
    "url": "https://exemple.fr/affiche.jpg",
    "alt": "Affiche officielle de l’événement 2027",
    "kind": "poster",
    "source_url": "https://exemple.fr/",
    "credit": "Organisateur"
  }
}
```

Laisser `days` vide si les jours de présence ne sont pas publiés. Ne pas déduire une présence de la simple durée de la convention. `guests_complete: false` signale une sélection non exhaustive. Une photo générique de festival porte `kind: "ambiance"` et ne doit pas être présentée comme l’affiche d’une édition.

Au 19 novembre 2026, 35 fiches d’invités sont renseignées sur six événements ; certains invités figurent sur plusieurs éditions. Les premiers visuels officiels et photos d’ambiance couvrent 15 événements. Les autres utilisent les illustrations de catégorie.

Les tests vérifient également les favoris, les invités et leurs sources, les jours de présence, le calendrier mensuel, la carte et l’export ICS (échappement, dates de fin et lignes UTF-8).
