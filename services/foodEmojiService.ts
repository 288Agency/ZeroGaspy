// ============================================
// FOOD EMOJI SERVICE
// Illustrations Fluent Emoji 3D (Microsoft, MIT) pour les aliments.
// Assets : assets/emoji/*.png — sources github.com/microsoft/fluentui-emoji
//
// Résolution : nom exact -> nom partiel -> catégorie -> défaut.
// Ajouter un aliment = ajouter le mot-clé dans FOOD_EMOJI_MAPPINGS.
// Ajouter une image = déposer le PNG dans assets/emoji/ + une entrée dans EMOJI.
// ============================================

import { ImageSourcePropType } from 'react-native';

export type FoodEmojiSlug =
  | 'redApple'
  | 'greenApple'
  | 'banana'
  | 'tangerine'
  | 'strawberry'
  | 'blueberries'
  | 'grapes'
  | 'lemon'
  | 'pear'
  | 'kiwi'
  | 'mango'
  | 'pineapple'
  | 'melon'
  | 'watermelon'
  | 'cherries'
  | 'peach'
  | 'coconut'
  | 'avocado'
  | 'olive'
  | 'chestnut'
  | 'peanuts'
  | 'tomato'
  | 'carrot'
  | 'greenSalad'
  | 'leafyGreen'
  | 'broccoli'
  | 'cucumber'
  | 'eggplant'
  | 'bellPepper'
  | 'hotPepper'
  | 'onion'
  | 'garlic'
  | 'potato'
  | 'sweetPotato'
  | 'mushroom'
  | 'beans'
  | 'corn'
  | 'ginger'
  | 'herb'
  | 'poultry'
  | 'meat'
  | 'meatOnBone'
  | 'hotDog'
  | 'bacon'
  | 'cannedFood'
  | 'fish'
  | 'shrimp'
  | 'lobster'
  | 'crab'
  | 'oyster'
  | 'squid'
  | 'shell'
  | 'milk'
  | 'bowlSpoon'
  | 'butter'
  | 'cheese'
  | 'egg'
  | 'bread'
  | 'baguette'
  | 'croissant'
  | 'bagel'
  | 'pretzel'
  | 'pancakes'
  | 'waffle'
  | 'pizza'
  | 'sandwich'
  | 'burger'
  | 'fries'
  | 'taco'
  | 'burrito'
  | 'sushi'
  | 'dumpling'
  | 'panOfFood'
  | 'soup'
  | 'pasta'
  | 'rice'
  | 'curry'
  | 'takeout'
  | 'flour'
  | 'jar'
  | 'honey'
  | 'salt'
  | 'cookie'
  | 'cake'
  | 'birthday'
  | 'cupcake'
  | 'pie'
  | 'doughnut'
  | 'popcorn'
  | 'chocolate'
  | 'candy'
  | 'lollipop'
  | 'iceCream'
  | 'ice'
  | 'water'
  | 'soda'
  | 'juice'
  | 'smoothie'
  | 'coffee'
  | 'tea'
  | 'wine'
  | 'beer'
  | 'babyBottle'
  | 'cooking'
  | 'stuffedFlatbread'
  | 'potOfFood'
  | 'bento'
  | 'friedShrimp'
  | 'custard'
  | 'cocktailGlass'
  | 'clinkingGlasses'
  | 'tumblerGlass'
  | 'clinkingBeerMugs'
  | 'plate';

const EMOJI: Record<FoodEmojiSlug, ImageSourcePropType> = {
  redApple:         require('../assets/emoji/red-apple.png'),
  greenApple:       require('../assets/emoji/green-apple.png'),
  banana:           require('../assets/emoji/banana.png'),
  tangerine:        require('../assets/emoji/tangerine.png'),
  strawberry:       require('../assets/emoji/strawberry.png'),
  blueberries:      require('../assets/emoji/blueberries.png'),
  grapes:           require('../assets/emoji/grapes.png'),
  lemon:            require('../assets/emoji/lemon.png'),
  pear:             require('../assets/emoji/pear.png'),
  kiwi:             require('../assets/emoji/kiwi.png'),
  mango:            require('../assets/emoji/mango.png'),
  pineapple:        require('../assets/emoji/pineapple.png'),
  melon:            require('../assets/emoji/melon.png'),
  watermelon:       require('../assets/emoji/watermelon.png'),
  cherries:         require('../assets/emoji/cherries.png'),
  peach:            require('../assets/emoji/peach.png'),
  coconut:          require('../assets/emoji/coconut.png'),
  avocado:          require('../assets/emoji/avocado.png'),
  olive:            require('../assets/emoji/olive.png'),
  chestnut:         require('../assets/emoji/chestnut.png'),
  peanuts:          require('../assets/emoji/peanuts.png'),
  tomato:           require('../assets/emoji/tomato.png'),
  carrot:           require('../assets/emoji/carrot.png'),
  greenSalad:       require('../assets/emoji/green-salad.png'),
  leafyGreen:       require('../assets/emoji/leafy-green.png'),
  broccoli:         require('../assets/emoji/broccoli.png'),
  cucumber:         require('../assets/emoji/cucumber.png'),
  eggplant:         require('../assets/emoji/eggplant.png'),
  bellPepper:       require('../assets/emoji/bell-pepper.png'),
  hotPepper:        require('../assets/emoji/hot-pepper.png'),
  onion:            require('../assets/emoji/onion.png'),
  garlic:           require('../assets/emoji/garlic.png'),
  potato:           require('../assets/emoji/potato.png'),
  sweetPotato:      require('../assets/emoji/sweet-potato.png'),
  mushroom:         require('../assets/emoji/mushroom.png'),
  beans:            require('../assets/emoji/beans.png'),
  corn:             require('../assets/emoji/corn.png'),
  ginger:           require('../assets/emoji/ginger.png'),
  herb:             require('../assets/emoji/herb.png'),
  poultry:          require('../assets/emoji/poultry.png'),
  meat:             require('../assets/emoji/meat.png'),
  meatOnBone:       require('../assets/emoji/meat-on-bone.png'),
  hotDog:           require('../assets/emoji/hot-dog.png'),
  bacon:            require('../assets/emoji/bacon.png'),
  cannedFood:       require('../assets/emoji/canned-food.png'),
  fish:             require('../assets/emoji/fish.png'),
  shrimp:           require('../assets/emoji/shrimp.png'),
  lobster:          require('../assets/emoji/lobster.png'),
  crab:             require('../assets/emoji/crab.png'),
  oyster:           require('../assets/emoji/oyster.png'),
  squid:            require('../assets/emoji/squid.png'),
  shell:            require('../assets/emoji/shell.png'),
  milk:             require('../assets/emoji/milk.png'),
  bowlSpoon:        require('../assets/emoji/bowl-spoon.png'),
  butter:           require('../assets/emoji/butter.png'),
  cheese:           require('../assets/emoji/cheese.png'),
  egg:              require('../assets/emoji/egg.png'),
  bread:            require('../assets/emoji/bread.png'),
  baguette:         require('../assets/emoji/baguette.png'),
  croissant:        require('../assets/emoji/croissant.png'),
  bagel:            require('../assets/emoji/bagel.png'),
  pretzel:          require('../assets/emoji/pretzel.png'),
  pancakes:         require('../assets/emoji/pancakes.png'),
  waffle:           require('../assets/emoji/waffle.png'),
  pizza:            require('../assets/emoji/pizza.png'),
  sandwich:         require('../assets/emoji/sandwich.png'),
  burger:           require('../assets/emoji/burger.png'),
  fries:            require('../assets/emoji/fries.png'),
  taco:             require('../assets/emoji/taco.png'),
  burrito:          require('../assets/emoji/burrito.png'),
  sushi:            require('../assets/emoji/sushi.png'),
  dumpling:         require('../assets/emoji/dumpling.png'),
  panOfFood:        require('../assets/emoji/pan-of-food.png'),
  soup:             require('../assets/emoji/soup.png'),
  pasta:            require('../assets/emoji/pasta.png'),
  rice:             require('../assets/emoji/rice.png'),
  curry:            require('../assets/emoji/curry.png'),
  takeout:          require('../assets/emoji/takeout.png'),
  flour:            require('../assets/emoji/flour.png'),
  jar:              require('../assets/emoji/jar.png'),
  honey:            require('../assets/emoji/honey.png'),
  salt:             require('../assets/emoji/salt.png'),
  cookie:           require('../assets/emoji/cookie.png'),
  cake:             require('../assets/emoji/cake.png'),
  birthday:         require('../assets/emoji/birthday.png'),
  cupcake:          require('../assets/emoji/cupcake.png'),
  pie:              require('../assets/emoji/pie.png'),
  doughnut:         require('../assets/emoji/doughnut.png'),
  popcorn:          require('../assets/emoji/popcorn.png'),
  chocolate:        require('../assets/emoji/chocolate.png'),
  candy:            require('../assets/emoji/candy.png'),
  lollipop:         require('../assets/emoji/lollipop.png'),
  iceCream:         require('../assets/emoji/ice-cream.png'),
  ice:              require('../assets/emoji/ice.png'),
  water:            require('../assets/emoji/water.png'),
  soda:             require('../assets/emoji/soda.png'),
  juice:            require('../assets/emoji/juice.png'),
  smoothie:         require('../assets/emoji/smoothie.png'),
  coffee:           require('../assets/emoji/coffee.png'),
  tea:              require('../assets/emoji/tea.png'),
  wine:             require('../assets/emoji/wine.png'),
  beer:             require('../assets/emoji/beer.png'),
  babyBottle:       require('../assets/emoji/baby-bottle.png'),
  cooking:          require('../assets/emoji/cooking.png'),
  stuffedFlatbread: require('../assets/emoji/stuffed-flatbread.png'),
  potOfFood:        require('../assets/emoji/pot-of-food.png'),
  bento:            require('../assets/emoji/bento.png'),
  friedShrimp:      require('../assets/emoji/fried-shrimp.png'),
  custard:          require('../assets/emoji/custard.png'),
  cocktailGlass:    require('../assets/emoji/cocktail-glass.png'),
  clinkingGlasses:  require('../assets/emoji/clinking-glasses.png'),
  tumblerGlass:     require('../assets/emoji/tumbler-glass.png'),
  clinkingBeerMugs: require('../assets/emoji/clinking-beer-mugs.png'),
  plate:            require('../assets/emoji/plate.png'),
};

const FOOD_EMOJI_MAPPINGS: { keywords: string[]; emoji: FoodEmojiSlug }[] = [
  { keywords: ['pomme', 'pommes'], emoji: 'redApple' },
  { keywords: ['pomme verte', 'granny'], emoji: 'greenApple' },
  { keywords: ['banane', 'bananes'], emoji: 'banana' },
  { keywords: ['orange', 'oranges', 'clémentine', 'clémentines', 'mandarine'], emoji: 'tangerine' },
  { keywords: ['fraise', 'fraises'], emoji: 'strawberry' },
  { keywords: ['myrtille', 'myrtilles', 'fruits rouges', 'framboise', 'framboises'], emoji: 'blueberries' },
  { keywords: ['raisin', 'raisins'], emoji: 'grapes' },
  { keywords: ['citron', 'citrons', 'lime'], emoji: 'lemon' },
  { keywords: ['poire', 'poires'], emoji: 'pear' },
  { keywords: ['kiwi', 'kiwis'], emoji: 'kiwi' },
  { keywords: ['mangue', 'mangues'], emoji: 'mango' },
  { keywords: ['ananas'], emoji: 'pineapple' },
  { keywords: ['melon'], emoji: 'melon' },
  { keywords: ['pastèque'], emoji: 'watermelon' },
  { keywords: ['cerise', 'cerises'], emoji: 'cherries' },
  { keywords: ['pêche', 'pêches', 'nectarine', 'abricot', 'abricots'], emoji: 'peach' },
  { keywords: ['noix de coco', 'coco'], emoji: 'coconut' },
  { keywords: ['avocat', 'avocats'], emoji: 'avocado' },
  { keywords: ['olive', 'olives', 'huile'], emoji: 'olive' },
  { keywords: ['châtaigne', 'marron', 'marrons', 'noix', 'noisette'], emoji: 'chestnut' },
  { keywords: ['cacahuète', 'cacahuètes', 'arachide'], emoji: 'peanuts' },
  { keywords: ['tomate', 'tomates'], emoji: 'tomato' },
  { keywords: ['carotte', 'carottes'], emoji: 'carrot' },
  { keywords: ['salade', 'laitue', 'mâche', 'roquette', 'crudités'], emoji: 'greenSalad' },
  { keywords: ['épinard', 'épinards', 'chou', 'choux', 'blette', 'endive'], emoji: 'leafyGreen' },
  { keywords: ['brocoli', 'brocolis', 'chou-fleur'], emoji: 'broccoli' },
  { keywords: ['concombre', 'concombres', 'courgette', 'courgettes'], emoji: 'cucumber' },
  { keywords: ['aubergine', 'aubergines'], emoji: 'eggplant' },
  { keywords: ['poivron', 'poivrons'], emoji: 'bellPepper' },
  { keywords: ['piment', 'piments'], emoji: 'hotPepper' },
  { keywords: ['oignon', 'oignons', 'échalote', 'échalotes'], emoji: 'onion' },
  { keywords: ['ail'], emoji: 'garlic' },
  { keywords: ['pomme de terre', 'patate', 'patates', 'navet', 'navets'], emoji: 'potato' },
  { keywords: ['patate douce', 'butternut', 'courge', 'potiron', 'citrouille'], emoji: 'sweetPotato' },
  { keywords: ['champignon', 'champignons'], emoji: 'mushroom' },
  { keywords: ['haricot', 'haricots', 'petit pois', 'petits pois', 'pois', 'lentille', 'lentilles', 'pois chiche', 'haricot sec', 'fève'], emoji: 'beans' },
  { keywords: ['maïs'], emoji: 'corn' },
  { keywords: ['gingembre', 'radis'], emoji: 'ginger' },
  { keywords: ['herbe', 'herbes', 'persil', 'basilic', 'coriandre', 'thym', 'aromate', 'céleri', 'poireau', 'poireaux', 'asperge', 'asperges'], emoji: 'herb' },
  { keywords: ['poulet', 'volaille', 'dinde', 'canard'], emoji: 'poultry' },
  { keywords: ['boeuf', 'bœuf', 'steak', 'viande', 'porc', 'jambon', 'saucisson', 'salami', 'chorizo', 'rosette', 'coppa'], emoji: 'meat' },
  { keywords: ['agneau', 'veau', 'côte', 'gigot'], emoji: 'meatOnBone' },
  { keywords: ['saucisse', 'saucisses', 'merguez', 'boudin', 'andouillette', 'knacki'], emoji: 'hotDog' },
  { keywords: ['bacon', 'lardons', 'poitrine'], emoji: 'bacon' },
  { keywords: ['pâté', 'rillettes', 'terrine', 'conserve', 'tomate pelée', 'boîte'], emoji: 'cannedFood' },
  { keywords: ['poisson', 'saumon', 'thon', 'cabillaud', 'sole', 'truite', 'sardine', 'maquereau', 'colin', 'lieu', 'merlu'], emoji: 'fish' },
  { keywords: ['crevette', 'crevettes', 'gambas'], emoji: 'shrimp' },
  { keywords: ['homard', 'langouste', 'langoustine'], emoji: 'lobster' },
  { keywords: ['crabe', 'tourteau'], emoji: 'crab' },
  { keywords: ['huître', 'huîtres', 'moule', 'moules', 'coquille saint-jacques'], emoji: 'oyster' },
  { keywords: ['calamar', 'calamars', 'encornet', 'poulpe'], emoji: 'squid' },
  { keywords: ['fruits de mer', 'coquillage', 'bulot'], emoji: 'shell' },
  { keywords: ['lait', 'crème', 'crème fraîche'], emoji: 'milk' },
  { keywords: ['yaourt', 'yogurt', 'yogourt', 'skyr', 'fromage blanc', 'céréales', 'muesli', 'granola', 'corn flakes', 'flocons', 'porridge'], emoji: 'bowlSpoon' },
  { keywords: ['beurre', 'margarine'], emoji: 'butter' },
  { keywords: ['fromage', 'gruyère', 'emmental', 'comté', 'camembert', 'brie', 'roquefort', 'raclette', 'reblochon', 'mozzarella', 'feta', 'parmesan', 'chèvre', 'cheddar'], emoji: 'cheese' },
  { keywords: ['oeuf', 'oeufs', 'œuf', 'œufs'], emoji: 'egg' },
  { keywords: ['pain', 'pain de mie', 'brioche'], emoji: 'bread' },
  { keywords: ['baguette', 'ficelle'], emoji: 'baguette' },
  { keywords: ['croissant', 'viennoiserie', 'pain au chocolat', 'chocolatine'], emoji: 'croissant' },
  { keywords: ['bagel'], emoji: 'bagel' },
  { keywords: ['bretzel'], emoji: 'pretzel' },
  { keywords: ['pancake', 'pancakes', 'crêpe', 'crêpes'], emoji: 'pancakes' },
  { keywords: ['gaufre', 'gaufres'], emoji: 'waffle' },
  { keywords: ['pizza'], emoji: 'pizza' },
  { keywords: ['sandwich', 'wrap', 'croque', 'panini'], emoji: 'sandwich' },
  { keywords: ['burger', 'hamburger', 'cheeseburger'], emoji: 'burger' },
  { keywords: ['frite', 'frites'], emoji: 'fries' },
  { keywords: ['taco', 'tacos', 'fajita'], emoji: 'taco' },
  { keywords: ['burrito'], emoji: 'burrito' },
  { keywords: ['sushi', 'maki', 'sashimi'], emoji: 'sushi' },
  { keywords: ['nem', 'nems', 'samoussa', 'ravioli', 'gyoza'], emoji: 'dumpling' },
  { keywords: ['plat préparé', 'lasagne', 'lasagnes', 'gratin', 'quiche', 'paella', 'poêlée'], emoji: 'panOfFood' },
  { keywords: ['soupe', 'ramen', 'bouillon', 'velouté', 'potage'], emoji: 'soup' },
  { keywords: ['pâtes', 'spaghetti', 'penne', 'tagliatelle', 'macaroni'], emoji: 'pasta' },
  { keywords: ['riz', 'quinoa', 'semoule', 'boulgour'], emoji: 'rice' },
  { keywords: ['curry'], emoji: 'curry' },
  { keywords: ['plat à emporter', 'traiteur', 'restes'], emoji: 'takeout' },
  { keywords: ['farine', 'blé'], emoji: 'flour' },
  { keywords: ['moutarde', 'ketchup', 'mayonnaise', 'mayo', 'sauce', 'pesto', 'harissa', 'vinaigre', 'vinaigrette', 'cornichon', 'confiture', 'marmelade', 'nutella', 'pâte à tartiner', 'compote'], emoji: 'jar' },
  { keywords: ['miel'], emoji: 'honey' },
  { keywords: ['sel', 'poivre', 'épice', 'épices', 'cumin', 'paprika', 'sucre', 'assaisonnement'], emoji: 'salt' },
  { keywords: ['biscuit', 'biscuits', 'cookie', 'cookies', 'madeleine', 'sablé', 'petit-beurre'], emoji: 'cookie' },
  { keywords: ['gâteau', 'part de gâteau', 'pâtisserie'], emoji: 'cake' },
  { keywords: ['gâteau d\'anniversaire', 'anniversaire'], emoji: 'birthday' },
  { keywords: ['cupcake', 'muffin'], emoji: 'cupcake' },
  { keywords: ['tarte', 'tourte'], emoji: 'pie' },
  { keywords: ['donut', 'beignet'], emoji: 'doughnut' },
  { keywords: ['popcorn', 'chips', 'crackers', 'apéritif', 'apéro'], emoji: 'popcorn' },
  { keywords: ['chocolat', 'tablette de chocolat', 'barre de céréales', 'barre énergétique'], emoji: 'chocolate' },
  { keywords: ['bonbon', 'bonbons', 'guimauve', 'confiserie'], emoji: 'candy' },
  { keywords: ['sucette'], emoji: 'lollipop' },
  { keywords: ['glace', 'crème glacée', 'sorbet', 'esquimau'], emoji: 'iceCream' },
  { keywords: ['surgelé', 'surgelés', 'glaçon', 'congelé'], emoji: 'ice' },
  { keywords: ['eau', 'bouteille d\'eau'], emoji: 'water' },
  { keywords: ['soda', 'coca', 'limonade', 'boisson'], emoji: 'soda' },
  { keywords: ['jus', 'juice', 'nectar', 'brique'], emoji: 'juice' },
  { keywords: ['smoothie', 'cocktail'], emoji: 'smoothie' },
  { keywords: ['café', 'expresso'], emoji: 'coffee' },
  { keywords: ['thé', 'infusion', 'tisane'], emoji: 'tea' },
  { keywords: ['vin', 'rosé', 'champagne'], emoji: 'wine' },
  { keywords: ['bière', 'bières'], emoji: 'beer' },
  { keywords: ['biberon', 'lait infantile'], emoji: 'babyBottle' },
  { keywords: ['omelette', 'oeuf au plat', 'œuf au plat', 'brouillade'], emoji: 'cooking' },
  { keywords: ['kebab', 'pita', 'gyros', 'durum'], emoji: 'stuffedFlatbread' },
  { keywords: ['ragoût', 'pot-au-feu', 'mijoté', 'blanquette', 'bourguignon'], emoji: 'potOfFood' },
  { keywords: ['bento', 'lunch box'], emoji: 'bento' },
  { keywords: ['tempura', 'beignet de crevette'], emoji: 'friedShrimp' },
  { keywords: ['flan', 'crème caramel', 'crème dessert'], emoji: 'custard' },
  { keywords: ['martini', 'apéritif'], emoji: 'cocktailGlass' },
  { keywords: [], emoji: 'clinkingGlasses' },
  { keywords: ['whisky', 'rhum', 'spiritueux'], emoji: 'tumblerGlass' },
  { keywords: [], emoji: 'clinkingBeerMugs' },
  { keywords: ['repas', 'plat'], emoji: 'plate' },
];

const CATEGORY_EMOJI: Record<string, FoodEmojiSlug> = {
  'fruits':                    'redApple',
  'légumes':                   'carrot',
  'vegetables':                'carrot',
  'viande':                    'meat',
  'meat':                      'meat',
  'charcuterie':               'bacon',
  'poisson & fruits de mer':   'fish',
  'poisson':                   'fish',
  'produits laitiers':         'milk',
  'laitiers':                  'milk',
  'dairy':                     'milk',
  'fromages':                  'cheese',
  'oeufs':                     'egg',
  'boulangerie':               'bread',
  'bakery':                    'bread',
  'pain':                      'bread',
  'plats préparés':            'panOfFood',
  'épicerie':                  'cannedFood',
  'snacks & biscuits':         'cookie',
  'snacks':                    'cookie',
  'confiseries':               'candy',
  'condiments & sauces':       'jar',
  'petit-déjeuner & céréales': 'bowlSpoon',
  'surgelés':                  'ice',
  'boissons':                  'soda',
  'épices':                    'salt',
  'autre':                     'plate',
  'other':                     'plate',
};

/** Caractère emoji -> illustration 3D (recettes, badges…). */
const GLYPH_EMOJI: Record<string, FoodEmojiSlug> = {
  '🍎': 'redApple',
  '🍏': 'greenApple',
  '🍌': 'banana',
  '🍊': 'tangerine',
  '🍓': 'strawberry',
  '🫐': 'blueberries',
  '🍇': 'grapes',
  '🍋': 'lemon',
  '🍐': 'pear',
  '🥝': 'kiwi',
  '🥭': 'mango',
  '🍍': 'pineapple',
  '🍈': 'melon',
  '🍉': 'watermelon',
  '🍒': 'cherries',
  '🍑': 'peach',
  '🥥': 'coconut',
  '🥑': 'avocado',
  '🫒': 'olive',
  '🌰': 'chestnut',
  '🥜': 'peanuts',
  '🍅': 'tomato',
  '🥕': 'carrot',
  '🥗': 'greenSalad',
  '🥬': 'leafyGreen',
  '🥦': 'broccoli',
  '🥒': 'cucumber',
  '🍆': 'eggplant',
  '🫑': 'bellPepper',
  '🌶️': 'hotPepper',
  '🧅': 'onion',
  '🧄': 'garlic',
  '🥔': 'potato',
  '🍠': 'sweetPotato',
  '🍄‍🟫': 'mushroom',
  '🫘': 'beans',
  '🌽': 'corn',
  '🫚': 'ginger',
  '🌿': 'herb',
  '🍗': 'poultry',
  '🥩': 'meat',
  '🍖': 'meatOnBone',
  '🌭': 'hotDog',
  '🥓': 'bacon',
  '🥫': 'cannedFood',
  '🐟': 'fish',
  '🦐': 'shrimp',
  '🦞': 'lobster',
  '🦀': 'crab',
  '🦪': 'oyster',
  '🦑': 'squid',
  '🐚': 'shell',
  '🥛': 'milk',
  '🥣': 'bowlSpoon',
  '🧈': 'butter',
  '🧀': 'cheese',
  '🥚': 'egg',
  '🍞': 'bread',
  '🥖': 'baguette',
  '🥐': 'croissant',
  '🥯': 'bagel',
  '🥨': 'pretzel',
  '🥞': 'pancakes',
  '🧇': 'waffle',
  '🍕': 'pizza',
  '🥪': 'sandwich',
  '🍔': 'burger',
  '🍟': 'fries',
  '🌮': 'taco',
  '🌯': 'burrito',
  '🍣': 'sushi',
  '🥟': 'dumpling',
  '🥘': 'panOfFood',
  '🍜': 'soup',
  '🍝': 'pasta',
  '🍚': 'rice',
  '🍛': 'curry',
  '🥡': 'takeout',
  '🌾': 'flour',
  '🫙': 'jar',
  '🍯': 'honey',
  '🧂': 'salt',
  '🍪': 'cookie',
  '🍰': 'cake',
  '🎂': 'birthday',
  '🧁': 'cupcake',
  '🥧': 'pie',
  '🍩': 'doughnut',
  '🍿': 'popcorn',
  '🍫': 'chocolate',
  '🍬': 'candy',
  '🍭': 'lollipop',
  '🍨': 'iceCream',
  '🧊': 'ice',
  '💧': 'water',
  '🥤': 'soda',
  '🧃': 'juice',
  '🍹': 'smoothie',
  '☕': 'coffee',
  '🍵': 'tea',
  '🍷': 'wine',
  '🍺': 'beer',
  '🍼': 'babyBottle',
  '🍳': 'cooking',
  '🥙': 'stuffedFlatbread',
  '🍲': 'potOfFood',
  '🍱': 'bento',
  '🍤': 'friedShrimp',
  '🍮': 'custard',
  '🍸': 'cocktailGlass',
  '🥂': 'clinkingGlasses',
  '🥃': 'tumblerGlass',
  '🍻': 'clinkingBeerMugs',
  '🍽️': 'plate',
};

const DEFAULT_EMOJI: FoodEmojiSlug = 'plate';

function normalize(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

/**
 * Forme de comparaison : minuscules sans accents, tirets ramenés à des espaces,
 * et pluriel retiré de chaque mot d'au moins 4 lettres. Appliquée des deux côtés
 * (mot-clé et saisie), elle rend « Patates douces bio » comparable à
 * « patate douce » sans avoir à lister chaque pluriel.
 */
function matchKey(value: string): string {
  return normalize(value)
    .split(/[\s-]+/)
    .map((word) => (word.length >= 4 ? word.replace(/[sx]$/, '') : word))
    .join(' ');
}

const NORMALIZED_MAPPINGS = FOOD_EMOJI_MAPPINGS.map(({ keywords, emoji }) => ({
  keywords: keywords.map(matchKey),
  emoji,
}));

const NORMALIZED_CATEGORIES: Record<string, FoodEmojiSlug> = Object.fromEntries(
  Object.entries(CATEGORY_EMOJI).map(([key, value]) => [normalize(key), value])
);

/**
 * Résout le slug d'illustration pour un aliment.
 * Ordre : mot-clé exact -> mot-clé contenu (le plus long gagne) -> catégorie -> défaut.
 */
export function getFoodEmojiSlug(foodName?: string, category?: string): FoodEmojiSlug {
  const name = foodName ? matchKey(foodName) : '';

  if (name) {
    const exact = NORMALIZED_MAPPINGS.find((m) => m.keywords.includes(name));
    if (exact) return exact.emoji;

    // Correspondance partielle : on garde le mot-clé le plus spécifique
    // ('pomme de terre' doit battre 'pomme').
    let best: { emoji: FoodEmojiSlug; length: number } | null = null;
    for (const mapping of NORMALIZED_MAPPINGS) {
      for (const keyword of mapping.keywords) {
        if (name.includes(keyword) && (!best || keyword.length > best.length)) {
          best = { emoji: mapping.emoji, length: keyword.length };
        }
      }
    }
    if (best) return best.emoji;
  }

  if (category) {
    const fromCategory = NORMALIZED_CATEGORIES[normalize(category)];
    if (fromCategory) return fromCategory;
  }

  return DEFAULT_EMOJI;
}

/** Illustration Fluent 3D pour un aliment — toujours une image utilisable. */
export function getFoodEmoji(foodName?: string, category?: string): ImageSourcePropType {
  return EMOJI[getFoodEmojiSlug(foodName, category)];
}

/** Illustration correspondant à un caractère emoji, ou null si non bundlé. */
export function getEmojiImage(glyph?: string): ImageSourcePropType | null {
  if (!glyph) return null;
  const slug = GLYPH_EMOJI[glyph.trim()];
  return slug ? EMOJI[slug] : null;
}

/** Illustration d'une catégorie (tuiles AddFood, filtres…). */
export function getCategoryEmoji(category?: string): ImageSourcePropType {
  const slug = category ? NORMALIZED_CATEGORIES[normalize(category)] : undefined;
  return EMOJI[slug ?? DEFAULT_EMOJI];
}
