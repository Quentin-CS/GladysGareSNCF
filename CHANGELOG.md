# Changelog

Les changements notables de GareSNCF sont consignés ici.

## [Unreleased]

### Added

- Liste des gares suivies avec retrait depuis les appareils Gladys et dédoublonnage par identifiant SNCF.
- Filtres sur le code/ligne, la destination et le type de transport, globaux ou propres au widget.
- Déclencheurs de scène pour suppressions de trains et changements de voie, en complément des retards.
- Widget compact, compte à rebours avant départ et état de fraîcheur des données.
- Signalement des réponses API en erreur et des quotas HTTP 429 avec délai de nouvelle tentative quand fourni.
- Détection des suppressions via comparaison de l’horaire temps réel avec la base théorique (une requête API supplémentaire par gare et actualisation).
- Action de scène enrichie avec voie, retard et état de suppression du prochain train.

### Changed

- Le capteur de chaque gare expose aussi l’âge de la dernière actualisation.
- Le widget conserve le dernier tableau disponible lorsqu’une actualisation échoue.

## [2.1.0] - 2026-10-17

### Changed

- La recherche et la sélection des gares passent par l’écran Découverte de Gladys ; plusieurs gares peuvent être suivies simultanément.
- Les scènes et widgets peuvent cibler une gare ajoutée individuellement.
