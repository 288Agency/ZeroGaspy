/**
 * Mock Jest de phosphor-react-native.
 * Le vrai paquet est publie en ESM et tire react-native-svg : ni l'un ni l'autre
 * ne passe le transform ts-jest (environnement node). Les tests n'ont besoin que
 * des identifiants d'icones, jamais de leur rendu -> on renvoie un composant
 * stub pour n'importe quel export nomme.
 */
const stub = (name) => {
  const Icon = () => null;
  Icon.displayName = name;
  return Icon;
};

module.exports = new Proxy(
  {},
  {
    get: (target, prop) => {
      if (prop === '__esModule') return true;
      if (typeof prop !== 'string') return undefined;
      if (!(prop in target)) target[prop] = stub(prop);
      return target[prop];
    },
  },
);
