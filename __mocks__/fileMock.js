// Stub des assets statiques (png, ttf…) sous Jest.
// Metro renvoie un identifiant numérique pour un `require` d'image ; on imite ce
// contrat pour que les modules qui bundlent des assets restent testables.
module.exports = 1;
