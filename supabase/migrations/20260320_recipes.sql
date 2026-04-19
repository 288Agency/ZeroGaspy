-- ============================================================
-- Recettes ZeroGaspy - Tables, RLS, Functions & Seed Data
-- ============================================================

-- ============================================================
-- Table: recipes (built-in catalog, read-only for users)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.recipes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  name text NOT NULL,
  description text,
  ingredients text[] NOT NULL,
  preparation_time integer NOT NULL,
  difficulty text NOT NULL CHECK (difficulty IN ('facile','moyen','difficile')),
  category text NOT NULL CHECK (category IN ('entree','plat','dessert','snack','boisson','petit-dejeuner')),
  image_emoji text DEFAULT '🍳',
  image_url text,
  instructions text[] NOT NULL,
  tips text,
  tags text[],
  is_active boolean DEFAULT true,
  variant_group text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ============================================================
-- Table: user_recipes (user-created recipes, synced cross-device)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.user_recipes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  local_id text,  -- Client-generated ID for offline sync queue resolution
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  description text,
  ingredients text[] NOT NULL,
  preparation_time integer NOT NULL,
  difficulty text NOT NULL CHECK (difficulty IN ('facile','moyen','difficile')),
  category text NOT NULL CHECK (category IN ('entree','plat','dessert','snack','boisson','petit-dejeuner')),
  image_emoji text DEFAULT '🍳',
  image_url text,
  instructions text[] NOT NULL,
  tips text,
  tags text[],
  is_deleted boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ============================================================
-- Table: recipe_variants (A/B testing assignment per user)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.recipe_variants (
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  variant_group text NOT NULL DEFAULT 'default',
  assigned_at timestamptz DEFAULT now()
);

-- ============================================================
-- Indexes
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_recipes_category ON public.recipes(category);
CREATE INDEX IF NOT EXISTS idx_recipes_difficulty ON public.recipes(difficulty);
CREATE INDEX IF NOT EXISTS idx_recipes_is_active ON public.recipes(is_active);
CREATE INDEX IF NOT EXISTS idx_recipes_variant_group ON public.recipes(variant_group);
CREATE INDEX IF NOT EXISTS idx_user_recipes_user_id ON public.user_recipes(user_id);
CREATE INDEX IF NOT EXISTS idx_user_recipes_category ON public.user_recipes(category);
CREATE INDEX IF NOT EXISTS idx_user_recipes_is_deleted ON public.user_recipes(user_id, is_deleted);
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_recipes_local_id ON public.user_recipes(user_id, local_id) WHERE local_id IS NOT NULL;

-- ============================================================
-- RLS Policies
-- ============================================================
ALTER TABLE public.recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recipe_variants ENABLE ROW LEVEL SECURITY;

-- recipes: all authenticated users can read
CREATE POLICY "Authenticated users can view recipes"
  ON public.recipes FOR SELECT
  TO authenticated
  USING (true);

-- user_recipes: CRUD for own recipes only
CREATE POLICY "Users can view own recipes"
  ON public.user_recipes FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own recipes"
  ON public.user_recipes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own recipes"
  ON public.user_recipes FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own recipes"
  ON public.user_recipes FOR DELETE
  USING (auth.uid() = user_id);

-- recipe_variants: read own assignment
CREATE POLICY "Users can view own variant"
  ON public.recipe_variants FOR SELECT
  USING (auth.uid() = user_id);

-- ============================================================
-- Function: assign_recipe_variant()
-- ============================================================
CREATE OR REPLACE FUNCTION public.assign_recipe_variant()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_variant text;
  v_rand double precision;
BEGIN
  SELECT variant_group INTO v_variant
  FROM public.recipe_variants
  WHERE user_id = v_user_id;

  IF v_variant IS NOT NULL THEN
    RETURN v_variant;
  END IF;

  v_rand := random();
  IF v_rand < 0.34 THEN
    v_variant := 'default';
  ELSIF v_rand < 0.67 THEN
    v_variant := 'variant_a';
  ELSE
    v_variant := 'variant_b';
  END IF;

  INSERT INTO public.recipe_variants (user_id, variant_group)
  VALUES (v_user_id, v_variant)
  ON CONFLICT (user_id) DO NOTHING;

  SELECT variant_group INTO v_variant
  FROM public.recipe_variants
  WHERE user_id = v_user_id;

  RETURN v_variant;
END;
$$;

-- ============================================================
-- Seed Data: 100 built-in recipes
-- ============================================================

-- PETIT-DEJEUNER (1-6)
INSERT INTO public.recipes (slug, name, description, ingredients, preparation_time, difficulty, category, image_emoji, instructions, tips, tags) VALUES
('oeufs-brouilles', 'Oeufs brouillés', 'Des oeufs brouillés crémeux et savoureux', ARRAY['oeufs','beurre','lait','ciboulette'], 10, 'facile', 'petit-dejeuner', '🍳', ARRAY['Battre les oeufs avec le lait','Faire fondre le beurre dans une poêle','Verser les oeufs et remuer doucement','Retirer du feu quand encore crémeux','Parsemer de ciboulette'], NULL, ARRAY['rapide','protéiné']),
('pancakes-moelleux', 'Pancakes moelleux', 'Des pancakes américains pour un brunch parfait', ARRAY['farine','oeufs','lait','beurre','sucre','levure'], 20, 'facile', 'petit-dejeuner', '🥞', ARRAY['Mélanger les ingrédients secs','Ajouter le lait et les oeufs','Incorporer le beurre fondu','Cuire à la poêle par petites louches','Retourner quand des bulles apparaissent','Servir avec du sirop d''érable'], NULL, ARRAY['sucré','brunch']),
('smoothie-bowl', 'Smoothie bowl', 'Un bol de smoothie garni de fruits et granola', ARRAY['banane','fruits rouges','yaourt','granola','miel'], 10, 'facile', 'petit-dejeuner', '🥣', ARRAY['Mixer la banane congelée avec les fruits rouges','Ajouter le yaourt et mixer','Verser dans un bol','Garnir de granola et fruits frais','Arroser de miel'], NULL, ARRAY['healthy','végétarien','rapide']),
('tartines-completes', 'Tartines complètes', 'Tartines gourmandes pour bien commencer la journée', ARRAY['pain','avocat','oeufs','saumon fumé','fromage frais'], 15, 'facile', 'petit-dejeuner', '🥪', ARRAY['Toaster le pain','Écraser l''avocat','Cuire les oeufs au plat','Assembler les tartines','Ajouter le saumon et le fromage frais'], NULL, ARRAY['protéiné','complet']),
('porridge-aux-fruits', 'Porridge aux fruits', 'Un porridge onctueux et réconfortant', ARRAY['flocons d''avoine','lait','banane','miel','cannelle'], 10, 'facile', 'petit-dejeuner', '🥣', ARRAY['Chauffer le lait avec les flocons','Remuer jusqu''à épaississement','Ajouter la cannelle','Garnir de banane et miel','Servir chaud'], NULL, ARRAY['healthy','végétarien','réconfortant']),
('french-toast', 'French toast', 'Pain perdu à la française', ARRAY['pain','oeufs','lait','sucre','beurre','cannelle'], 15, 'facile', 'petit-dejeuner', '🍞', ARRAY['Battre les oeufs avec le lait et le sucre','Tremper les tranches de pain','Faire dorer au beurre','Saupoudrer de cannelle','Servir avec des fruits'], NULL, ARRAY['sucré','brunch']);

-- ENTREES (7-14)
INSERT INTO public.recipes (slug, name, description, ingredients, preparation_time, difficulty, category, image_emoji, instructions, tips, tags) VALUES
('salade-cesar', 'Salade César', 'Une salade fraîche et croquante', ARRAY['salade','poulet','parmesan','croûtons','tomate'], 20, 'facile', 'entree', '🥗', ARRAY['Laver et couper la salade','Griller le poulet et le couper en lamelles','Préparer les croûtons dorés','Assembler tous les ingrédients','Ajouter le parmesan en copeaux','Assaisonner avec la sauce César'], NULL, NULL),
('soupe-de-legumes', 'Soupe de légumes', 'Une soupe réconfortante et healthy', ARRAY['carotte','poireau','pomme de terre','oignon','céleri'], 40, 'facile', 'entree', '🍲', ARRAY['Éplucher et couper tous les légumes','Faire revenir l''oignon','Ajouter les légumes et couvrir d''eau','Laisser mijoter 30 minutes','Mixer selon la texture souhaitée','Assaisonner et servir chaud'], NULL, ARRAY['végétarien','healthy']),
('gaspacho', 'Gaspacho', 'Une soupe froide rafraîchissante', ARRAY['tomate','concombre','poivron','oignon','ail','huile d''olive'], 15, 'facile', 'entree', '🍅', ARRAY['Couper tous les légumes','Les mixer ensemble','Ajouter l''huile d''olive','Assaisonner','Réfrigérer au moins 2h','Servir très frais'], NULL, ARRAY['végétarien','healthy','été']),
('bruschetta', 'Bruschetta', 'Tartines italiennes aux tomates fraîches', ARRAY['pain','tomate','ail','basilic','huile d''olive'], 15, 'facile', 'entree', '🍅', ARRAY['Griller les tranches de pain','Frotter avec l''ail','Couper les tomates en dés','Mélanger avec le basilic et l''huile','Garnir les tartines'], NULL, ARRAY['végétarien','italien','rapide']),
('veloute-de-potiron', 'Velouté de potiron', 'Une soupe automnale onctueuse', ARRAY['potiron','oignon','crème','muscade','beurre'], 35, 'facile', 'entree', '🎃', ARRAY['Faire revenir l''oignon','Ajouter le potiron en cubes','Couvrir d''eau et cuire 20 min','Mixer finement','Ajouter la crème et la muscade'], NULL, ARRAY['végétarien','automne','réconfortant']),
('salade-grecque', 'Salade grecque', 'Fraîcheur méditerranéenne', ARRAY['tomate','concombre','feta','oignon','olives','huile d''olive'], 15, 'facile', 'entree', '🥗', ARRAY['Couper les tomates et le concombre','Émincer l''oignon rouge','Ajouter les olives et la feta','Assaisonner à l''huile d''olive','Ajouter de l''origan'], NULL, ARRAY['végétarien','méditerranéen','healthy']),
('houmous-maison', 'Houmous maison', 'Crème de pois chiches libanaise', ARRAY['pois chiches','tahini','citron','ail','huile d''olive'], 15, 'facile', 'entree', '🧆', ARRAY['Égoutter les pois chiches','Mixer avec le tahini et l''ail','Ajouter le jus de citron','Incorporer l''huile d''olive','Servir avec du pain pita'], NULL, ARRAY['végétarien','vegan','oriental']),
('soupe-miso', 'Soupe miso', 'Soupe japonaise traditionnelle', ARRAY['miso','tofu','algues','oignon vert','champignons'], 15, 'facile', 'entree', '🍜', ARRAY['Chauffer l''eau','Ajouter les algues et champignons','Délayer le miso','Ajouter le tofu en dés','Garnir d''oignon vert'], NULL, ARRAY['végétarien','japonais','léger']);

-- PLATS PRINCIPAUX (15-42)
INSERT INTO public.recipes (slug, name, description, ingredients, preparation_time, difficulty, category, image_emoji, instructions, tips, tags) VALUES
('omelette-aux-legumes', 'Omelette aux légumes', 'Une omelette simple et rapide avec les légumes du frigo', ARRAY['oeufs','tomate','oignon','fromage','poivron'], 15, 'facile', 'plat', '🍳', ARRAY['Battre les oeufs dans un bol','Couper les légumes en petits dés','Faire revenir les légumes dans une poêle','Verser les oeufs battus sur les légumes','Ajouter le fromage râpé','Plier l''omelette et servir'], 'Ajoutez des herbes fraîches pour plus de saveur', ARRAY['rapide','végétarien']),
('pates-a-la-carbonara', 'Pâtes à la carbonara', 'Le classique italien revisité', ARRAY['pâtes','lardons','oeufs','parmesan','crème'], 20, 'facile', 'plat', '🍝', ARRAY['Cuire les pâtes dans l''eau bouillante salée','Faire revenir les lardons','Mélanger les oeufs avec le parmesan','Égoutter les pâtes et les mélanger avec les lardons','Ajouter le mélange oeufs-parmesan hors du feu','Servir immédiatement'], NULL, ARRAY['italien','classique']),
('risotto-aux-champignons', 'Risotto aux champignons', 'Un risotto crémeux aux champignons', ARRAY['riz','champignons','oignon','vin blanc','parmesan','beurre'], 35, 'moyen', 'plat', '🍚', ARRAY['Faire revenir l''oignon émincé','Ajouter le riz et nacrer','Mouiller avec le vin blanc','Ajouter le bouillon petit à petit','Incorporer les champignons sautés','Finir avec le beurre et le parmesan'], NULL, ARRAY['italien','végétarien']),
('poulet-roti-aux-legumes', 'Poulet rôti aux légumes', 'Un classique familial savoureux', ARRAY['poulet','pomme de terre','carotte','oignon','ail','herbes'], 60, 'moyen', 'plat', '🍗', ARRAY['Préchauffer le four à 200°C','Assaisonner le poulet avec les herbes','Couper les légumes en morceaux','Disposer le tout dans un plat','Enfourner pendant 1h','Arroser régulièrement'], NULL, ARRAY['familial','classique']),
('quiche-lorraine', 'Quiche lorraine', 'Une quiche traditionnelle et gourmande', ARRAY['pâte brisée','lardons','oeufs','crème','fromage'], 45, 'moyen', 'plat', '🥧', ARRAY['Préchauffer le four à 180°C','Étaler la pâte dans un moule','Faire revenir les lardons','Battre les oeufs avec la crème','Répartir lardons et appareil sur la pâte','Cuire 35-40 minutes'], NULL, ARRAY['français','classique']),
('burger-maison', 'Burger maison', 'Un burger fait maison avec tous les garnitures', ARRAY['viande hachée','pain','salade','tomate','oignon','fromage'], 20, 'facile', 'plat', '🍔', ARRAY['Former les steaks avec la viande','Cuire à la poêle selon vos goûts','Toaster les pains','Préparer les garnitures','Assembler le burger','Servir avec des frites'], NULL, ARRAY['américain','rapide']),
('gratin-de-courgettes', 'Gratin de courgettes', 'Un gratin léger et savoureux', ARRAY['courgette','crème','fromage','ail','oignon'], 40, 'facile', 'plat', '🧀', ARRAY['Préchauffer le four à 180°C','Couper les courgettes en rondelles','Les faire revenir avec l''oignon','Disposer dans un plat à gratin','Verser la crème et parsemer de fromage','Gratiner 20 minutes'], NULL, ARRAY['végétarien','léger']),
('spaghetti-bolognaise', 'Spaghetti bolognaise', 'Le classique italien par excellence', ARRAY['pâtes','viande hachée','tomate','oignon','carotte','ail'], 45, 'facile', 'plat', '🍝', ARRAY['Faire revenir oignon, carotte et ail','Ajouter la viande hachée','Incorporer les tomates','Laisser mijoter 30 minutes','Cuire les pâtes','Servir avec du parmesan'], NULL, ARRAY['italien','familial']),
('wrap-au-poulet', 'Wrap au poulet', 'Un wrap frais et nourrissant', ARRAY['tortilla','poulet','salade','tomate','sauce'], 15, 'facile', 'plat', '🌯', ARRAY['Réchauffer la tortilla','Couper le poulet en lamelles','Disposer les ingrédients au centre','Ajouter la sauce','Rouler le wrap','Couper en deux et servir'], NULL, ARRAY['rapide','mexicain']),
('pizza-maison', 'Pizza maison', 'Une pizza avec les ingrédients du frigo', ARRAY['pâte à pizza','tomate','fromage','jambon','champignons'], 30, 'moyen', 'plat', '🍕', ARRAY['Préchauffer le four à 220°C','Étaler la pâte','Répartir la sauce tomate','Ajouter les garnitures','Parsemer de fromage','Cuire 15-20 minutes'], NULL, ARRAY['italien','familial']),
('riz-saute-aux-legumes', 'Riz sauté aux légumes', 'Un plat asiatique rapide et savoureux', ARRAY['riz','oeufs','carotte','petits pois','oignon','sauce soja'], 25, 'facile', 'plat', '🍜', ARRAY['Cuire le riz et le laisser refroidir','Faire sauter les légumes','Ajouter le riz froid','Pousser sur le côté et brouiller les oeufs','Mélanger le tout','Assaisonner avec la sauce soja'], NULL, ARRAY['asiatique','végétarien']),
('curry-de-poulet', 'Curry de poulet', 'Un curry indien onctueux et parfumé', ARRAY['poulet','oignon','tomate','lait de coco','curry','riz'], 40, 'moyen', 'plat', '🍛', ARRAY['Faire revenir l''oignon','Ajouter le poulet et dorer','Incorporer le curry et les tomates','Verser le lait de coco','Laisser mijoter 25 minutes','Servir avec du riz'], NULL, ARRAY['indien','épicé']),
('tacos-mexicains', 'Tacos mexicains', 'Des tacos garnis comme au Mexique', ARRAY['tortilla','viande hachée','tomate','salade','fromage','crème'], 25, 'facile', 'plat', '🌮', ARRAY['Cuire la viande avec les épices','Préparer la salsa','Réchauffer les tortillas','Garnir de viande et légumes','Ajouter fromage et crème'], NULL, ARRAY['mexicain','épicé']),
('pad-thai', 'Pad Thaï', 'Nouilles sautées thaïlandaises', ARRAY['nouilles de riz','crevettes','oeufs','cacahuètes','citron vert','sauce soja'], 30, 'moyen', 'plat', '🍜', ARRAY['Faire tremper les nouilles','Sauter les crevettes','Ajouter les oeufs brouillés','Incorporer les nouilles','Assaisonner et ajouter les cacahuètes','Servir avec du citron vert'], NULL, ARRAY['thaï','asiatique']),
('lasagnes', 'Lasagnes', 'Lasagnes gratinées à la bolognaise', ARRAY['pâtes à lasagne','viande hachée','tomate','béchamel','fromage'], 60, 'moyen', 'plat', '🍝', ARRAY['Préparer la sauce bolognaise','Préparer la béchamel','Alterner les couches de pâtes et sauces','Terminer par du fromage','Cuire au four 40 minutes'], NULL, ARRAY['italien','familial']),
('ratatouille', 'Ratatouille', 'Mijoté de légumes provençal', ARRAY['courgette','aubergine','poivron','tomate','oignon','ail'], 50, 'facile', 'plat', '🍆', ARRAY['Couper tous les légumes en dés','Faire revenir l''oignon et l''ail','Ajouter les légumes par étapes','Assaisonner avec les herbes de Provence','Laisser mijoter 30 minutes'], NULL, ARRAY['végétarien','provençal','healthy']),
('chili-con-carne', 'Chili con carne', 'Ragoût épicé tex-mex', ARRAY['viande hachée','haricots rouges','tomate','oignon','poivron','épices'], 45, 'facile', 'plat', '🌶️', ARRAY['Faire revenir la viande','Ajouter l''oignon et le poivron','Incorporer les tomates et haricots','Assaisonner avec les épices','Laisser mijoter 30 minutes'], NULL, ARRAY['mexicain','épicé']),
('poulet-teriyaki', 'Poulet teriyaki', 'Poulet glacé à la japonaise', ARRAY['poulet','sauce soja','miel','gingembre','ail','riz'], 25, 'facile', 'plat', '🍗', ARRAY['Mélanger sauce soja, miel et gingembre','Faire mariner le poulet','Cuire le poulet à la poêle','Glacer avec la sauce','Servir avec du riz'], NULL, ARRAY['japonais','asiatique']),
('gratin-dauphinois', 'Gratin dauphinois', 'Gratin de pommes de terre crémeux', ARRAY['pomme de terre','crème','lait','ail','muscade'], 60, 'facile', 'plat', '🥔', ARRAY['Couper les pommes de terre en rondelles','Frotter le plat à l''ail','Alterner pommes de terre et crème','Saupoudrer de muscade','Cuire au four 45 minutes'], NULL, ARRAY['français','végétarien']),
('saumon-grille', 'Saumon grillé', 'Pavé de saumon et ses légumes', ARRAY['saumon','citron','ail','brocoli','huile d''olive'], 25, 'facile', 'plat', '🐟', ARRAY['Assaisonner le saumon','Griller à la poêle 4 min par côté','Cuire les brocolis à la vapeur','Arroser de citron','Servir immédiatement'], NULL, ARRAY['healthy','poisson','rapide']),
('couscous-vegetarien', 'Couscous végétarien', 'Couscous aux légumes et pois chiches', ARRAY['semoule','pois chiches','carotte','courgette','navet','épices'], 45, 'moyen', 'plat', '🥘', ARRAY['Préparer le bouillon aux épices','Cuire les légumes dans le bouillon','Cuire la semoule à la vapeur','Ajouter les pois chiches','Servir avec la sauce'], NULL, ARRAY['végétarien','maghrébin']),
('poke-bowl', 'Poke bowl', 'Bowl hawaïen au poisson cru', ARRAY['riz','saumon','avocat','concombre','sauce soja','sésame'], 20, 'facile', 'plat', '🍣', ARRAY['Cuire le riz','Couper le saumon en cubes','Préparer les légumes','Assembler dans un bol','Arroser de sauce et sésame'], NULL, ARRAY['hawaïen','healthy','poisson']),
('shakshuka', 'Shakshuka', 'Oeufs pochés dans une sauce tomate épicée', ARRAY['oeufs','tomate','poivron','oignon','ail','épices'], 25, 'facile', 'plat', '🍳', ARRAY['Faire revenir oignon et poivron','Ajouter les tomates et épices','Laisser mijoter','Créer des puits et casser les oeufs','Couvrir et cuire 5-7 minutes'], NULL, ARRAY['oriental','végétarien']),
('boeuf-bourguignon', 'Boeuf bourguignon', 'Ragoût de boeuf au vin rouge', ARRAY['boeuf','vin rouge','carotte','oignon','champignons','lardons'], 120, 'difficile', 'plat', '🥩', ARRAY['Faire mariner le boeuf dans le vin','Faire revenir les lardons','Saisir la viande','Ajouter légumes et vin','Mijoter 2h à feu doux'], NULL, ARRAY['français','mijoté']),
('fajitas-au-poulet', 'Fajitas au poulet', 'Fajitas avec légumes grillés', ARRAY['poulet','tortilla','poivron','oignon','crème','fromage'], 30, 'facile', 'plat', '🌮', ARRAY['Émincer le poulet et les légumes','Faire sauter avec les épices','Réchauffer les tortillas','Garnir avec la préparation','Ajouter crème et fromage'], NULL, ARRAY['mexicain','rapide']),
('wok-de-legumes', 'Wok de légumes', 'Légumes croquants sautés au wok', ARRAY['brocoli','carotte','poivron','oignon','sauce soja','gingembre'], 20, 'facile', 'plat', '🥦', ARRAY['Couper tous les légumes','Chauffer le wok à feu vif','Sauter les légumes rapidement','Ajouter la sauce soja','Servir avec du riz ou des nouilles'], NULL, ARRAY['végétarien','asiatique','healthy','rapide']),
('croque-monsieur', 'Croque-monsieur', 'Sandwich grillé au jambon et fromage', ARRAY['pain de mie','jambon','fromage','beurre','béchamel'], 15, 'facile', 'plat', '🥪', ARRAY['Beurrer les tranches de pain','Garnir de jambon et fromage','Ajouter la béchamel','Fermer et griller','Servir chaud'], NULL, ARRAY['français','rapide']),
('buddha-bowl', 'Buddha bowl', 'Bol équilibré et coloré', ARRAY['quinoa','pois chiches','avocat','carotte','chou rouge','sauce tahini'], 30, 'facile', 'plat', '🥗', ARRAY['Cuire le quinoa','Rôtir les pois chiches','Préparer les légumes','Assembler dans un bol','Arroser de sauce tahini'], NULL, ARRAY['végétarien','vegan','healthy']);

-- SNACKS (43-46)
INSERT INTO public.recipes (slug, name, description, ingredients, preparation_time, difficulty, category, image_emoji, instructions, tips, tags) VALUES
('toast-avocat', 'Toast avocat', 'Un toast healthy et tendance', ARRAY['pain','avocat','oeufs','citron','tomate'], 10, 'facile', 'snack', '🥑', ARRAY['Toaster le pain','Écraser l''avocat avec du citron','Tartiner sur le pain','Ajouter un oeuf poché','Garnir de tomates cerises'], NULL, ARRAY['healthy','rapide','végétarien']),
('guacamole', 'Guacamole', 'Dip mexicain à l''avocat', ARRAY['avocat','tomate','oignon','citron vert','coriandre'], 10, 'facile', 'snack', '🥑', ARRAY['Écraser les avocats','Couper tomate et oignon en dés','Mélanger tous les ingrédients','Ajouter le jus de citron','Servir avec des chips'], NULL, ARRAY['mexicain','végétarien','vegan']),
('chips-de-legumes', 'Chips de légumes', 'Chips maison croustillantes', ARRAY['betterave','patate douce','carotte','huile','sel'], 30, 'facile', 'snack', '🥔', ARRAY['Trancher finement les légumes','Badigeonner d''huile','Enfourner à 180°C','Cuire jusqu''à croustillant','Saler et servir'], NULL, ARRAY['végétarien','vegan','healthy']),
('energy-balls', 'Energy balls', 'Boules d''énergie aux dattes', ARRAY['dattes','flocons d''avoine','beurre de cacahuète','chocolat','noix de coco'], 15, 'facile', 'snack', '🍫', ARRAY['Mixer les dattes','Ajouter les autres ingrédients','Former des boules','Rouler dans la noix de coco','Réfrigérer 30 minutes'], NULL, ARRAY['végétarien','healthy','sans cuisson']);

-- DESSERTS (47-56)
INSERT INTO public.recipes (slug, name, description, ingredients, preparation_time, difficulty, category, image_emoji, instructions, tips, tags) VALUES
('crepes-sucrees', 'Crêpes sucrées', 'Des crêpes moelleuses pour le goûter', ARRAY['farine','oeufs','lait','beurre','sucre'], 30, 'facile', 'dessert', '🥞', ARRAY['Mélanger farine et oeufs','Ajouter le lait progressivement','Incorporer le beurre fondu','Laisser reposer 30 minutes','Cuire les crêpes à la poêle','Garnir selon vos envies'], NULL, NULL),
('salade-de-fruits', 'Salade de fruits', 'Une salade de fruits fraîche et colorée', ARRAY['pomme','banane','orange','kiwi','fraise'], 15, 'facile', 'dessert', '🍇', ARRAY['Laver et éplucher les fruits','Les couper en morceaux','Mélanger dans un saladier','Arroser de jus d''orange','Réfrigérer avant de servir'], NULL, ARRAY['healthy','végétarien']),
('tarte-aux-pommes', 'Tarte aux pommes', 'Un dessert classique et délicieux', ARRAY['pâte feuilletée','pomme','sucre','beurre','cannelle'], 45, 'moyen', 'dessert', '🥧', ARRAY['Préchauffer le four à 180°C','Étaler la pâte dans un moule','Éplucher et couper les pommes','Les disposer en rosace','Saupoudrer de sucre et cannelle','Cuire 35-40 minutes'], NULL, ARRAY['français','classique']),
('banana-bread', 'Banana bread', 'Un gâteau moelleux à la banane', ARRAY['banane','farine','oeufs','sucre','beurre'], 60, 'moyen', 'dessert', '🍌', ARRAY['Préchauffer le four à 180°C','Écraser les bananes bien mûres','Mélanger avec le beurre fondu et le sucre','Ajouter les oeufs puis la farine','Verser dans un moule à cake','Cuire 45-50 minutes'], 'Utilisez des bananes très mûres pour plus de saveur', NULL),
('mousse-au-chocolat', 'Mousse au chocolat', 'Mousse légère et aérienne', ARRAY['chocolat','oeufs','sucre','beurre'], 20, 'moyen', 'dessert', '🍫', ARRAY['Faire fondre le chocolat','Séparer les blancs des jaunes','Mélanger jaunes et chocolat','Monter les blancs en neige','Incorporer délicatement','Réfrigérer 4h minimum'], NULL, ARRAY['français','classique']),
('tiramisu', 'Tiramisu', 'Dessert italien au café et mascarpone', ARRAY['mascarpone','oeufs','sucre','café','biscuits','cacao'], 30, 'moyen', 'dessert', '☕', ARRAY['Préparer le café et le laisser refroidir','Battre les jaunes avec le sucre','Incorporer le mascarpone','Monter les blancs et les incorporer','Tremper les biscuits dans le café','Alterner couches de crème et biscuits','Saupoudrer de cacao'], NULL, ARRAY['italien','sans cuisson']),
('fondant-au-chocolat', 'Fondant au chocolat', 'Gâteau au coeur coulant', ARRAY['chocolat','beurre','oeufs','sucre','farine'], 25, 'moyen', 'dessert', '🍫', ARRAY['Faire fondre chocolat et beurre','Battre oeufs et sucre','Mélanger les deux préparations','Ajouter la farine','Cuire 10-12 minutes à 200°C'], 'Le coeur doit rester coulant', NULL),
('panna-cotta', 'Panna cotta', 'Crème italienne aux fruits rouges', ARRAY['crème','lait','sucre','gélatine','vanille','fruits rouges'], 20, 'facile', 'dessert', '🍮', ARRAY['Faire tremper la gélatine','Chauffer crème, lait et sucre','Incorporer la gélatine','Verser dans des ramequins','Réfrigérer 4h','Démouler et servir avec les fruits'], NULL, ARRAY['italien','élégant']),
('clafoutis-aux-cerises', 'Clafoutis aux cerises', 'Dessert moelleux aux cerises', ARRAY['cerises','oeufs','farine','lait','sucre','beurre'], 45, 'facile', 'dessert', '🍒', ARRAY['Disposer les cerises dans un plat beurré','Battre les oeufs avec le sucre','Ajouter farine et lait','Verser sur les cerises','Cuire 35-40 minutes'], NULL, ARRAY['français','été']),
('crumble-aux-pommes', 'Crumble aux pommes', 'Dessert croustillant aux fruits', ARRAY['pomme','farine','beurre','sucre','cannelle'], 40, 'facile', 'dessert', '🍎', ARRAY['Couper les pommes en morceaux','Les disposer dans un plat','Sabler farine, beurre et sucre','Parsemer sur les pommes','Cuire 30 minutes à 180°C'], NULL, ARRAY['anglais','automne']);

-- BOISSONS (57-60)
INSERT INTO public.recipes (slug, name, description, ingredients, preparation_time, difficulty, category, image_emoji, instructions, tips, tags) VALUES
('smoothie-aux-fruits', 'Smoothie aux fruits', 'Un smoothie vitaminé et rafraîchissant', ARRAY['banane','fraise','lait','yaourt','miel'], 5, 'facile', 'boisson', '🥤', ARRAY['Éplucher et couper les fruits','Mettre tous les ingrédients dans le blender','Mixer jusqu''à consistance lisse','Servir frais'], NULL, ARRAY['healthy','végétarien','rapide']),
('smoothie-vert', 'Smoothie vert', 'Smoothie détox aux épinards', ARRAY['épinards','banane','pomme','gingembre','citron'], 5, 'facile', 'boisson', '🥬', ARRAY['Laver les épinards','Couper les fruits','Mixer tous les ingrédients','Ajouter de l''eau si nécessaire','Servir immédiatement'], NULL, ARRAY['healthy','vegan','détox']),
('chocolat-chaud', 'Chocolat chaud', 'Chocolat chaud onctueux maison', ARRAY['chocolat','lait','sucre','crème','cannelle'], 10, 'facile', 'boisson', '☕', ARRAY['Chauffer le lait','Ajouter le chocolat râpé','Remuer jusqu''à fonte complète','Ajouter la crème fouettée','Saupoudrer de cannelle'], NULL, ARRAY['réconfortant','hiver']),
('limonade-maison', 'Limonade maison', 'Limonade fraîche et désaltérante', ARRAY['citron','sucre','eau','menthe','glaçons'], 15, 'facile', 'boisson', '🍋', ARRAY['Presser les citrons','Dissoudre le sucre dans l''eau chaude','Mélanger jus et sirop','Ajouter la menthe fraîche','Servir très frais avec des glaçons'], NULL, ARRAY['été','rafraîchissant']);

-- PETIT-DEJEUNER suite (61-64)
INSERT INTO public.recipes (slug, name, description, ingredients, preparation_time, difficulty, category, image_emoji, instructions, tips, tags) VALUES
('granola-maison', 'Granola maison', 'Céréales croustillantes au miel et noix', ARRAY['flocons d''avoine','miel','amandes','noix','huile de coco'], 35, 'facile', 'petit-dejeuner', '🥣', ARRAY['Mélanger les flocons avec le miel et l''huile','Ajouter les noix concassées','Étaler sur une plaque de four','Cuire 20 min à 160°C en remuant','Laisser refroidir et conserver en bocal'], NULL, ARRAY['healthy','végétarien','batch cooking']),
('acai-bowl', 'Açaí bowl', 'Bowl brésilien aux superfruits', ARRAY['açaí','banane','fruits rouges','granola','noix de coco'], 10, 'facile', 'petit-dejeuner', '🫐', ARRAY['Mixer l''açaí congelé avec la banane','Verser dans un bol','Garnir de fruits rouges et granola','Parsemer de noix de coco râpée','Servir immédiatement'], NULL, ARRAY['healthy','vegan','superfood']),
('croque-madame', 'Croque madame', 'Croque-monsieur avec un oeuf sur le dessus', ARRAY['pain de mie','jambon','fromage','oeufs','beurre','béchamel'], 15, 'facile', 'petit-dejeuner', '🥪', ARRAY['Préparer le croque-monsieur classique','Griller au four avec la béchamel','Faire cuire un oeuf au plat','Poser l''oeuf sur le croque','Servir chaud'], NULL, ARRAY['français','brunch']),
('overnight-oats', 'Overnight oats', 'Flocons d''avoine préparés la veille', ARRAY['flocons d''avoine','lait','yaourt','fruits rouges','miel'], 5, 'facile', 'petit-dejeuner', '🥣', ARRAY['Mélanger les flocons avec le lait et le yaourt','Ajouter le miel','Couvrir et réfrigérer toute la nuit','Le matin, garnir de fruits frais','Déguster froid'], NULL, ARRAY['healthy','sans cuisson','rapide']);

-- ENTREES suite (65-69)
INSERT INTO public.recipes (slug, name, description, ingredients, preparation_time, difficulty, category, image_emoji, instructions, tips, tags) VALUES
('tabboule-libanais', 'Tabboulé libanais', 'Salade de boulgour aux herbes fraîches', ARRAY['boulgour','persil','tomate','oignon','citron','menthe'], 20, 'facile', 'entree', '🥗', ARRAY['Faire gonfler le boulgour dans l''eau','Hacher finement le persil et la menthe','Couper les tomates en dés','Mélanger le tout','Assaisonner avec le jus de citron et l''huile'], NULL, ARRAY['libanais','végétarien','été']),
('soupe-a-l-oignon', 'Soupe à l''oignon', 'Soupe gratinée à la française', ARRAY['oignon','beurre','vin blanc','pain','fromage'], 45, 'moyen', 'entree', '🧅', ARRAY['Émincer finement les oignons','Les faire caraméliser dans le beurre','Déglacer au vin blanc','Ajouter le bouillon et cuire 20 min','Servir avec pain et fromage gratiné'], NULL, ARRAY['français','hiver','réconfortant']),
('salade-de-chevre-chaud', 'Salade de chèvre chaud', 'Salade avec toasts de chèvre fondant', ARRAY['salade','chèvre','pain','miel','noix','tomate'], 15, 'facile', 'entree', '🥗', ARRAY['Déposer le chèvre sur des toasts','Passer au four 5 min','Préparer la salade','Disposer les toasts chauds','Arroser de miel et ajouter les noix'], NULL, ARRAY['français','végétarien']),
('tzatziki', 'Tzatziki', 'Dip grec au concombre et yaourt', ARRAY['yaourt','concombre','ail','menthe','huile d''olive','citron'], 10, 'facile', 'entree', '🥒', ARRAY['Râper le concombre et l''égoutter','Mélanger avec le yaourt','Ajouter l''ail haché et la menthe','Arroser d''huile d''olive et de citron','Réfrigérer 30 min avant de servir'], NULL, ARRAY['grec','végétarien','rapide']),
('veloute-de-carottes', 'Velouté de carottes', 'Soupe douce et orangée', ARRAY['carotte','oignon','pomme de terre','crème','cumin'], 30, 'facile', 'entree', '🥕', ARRAY['Faire revenir l''oignon','Ajouter carottes et pomme de terre en morceaux','Couvrir d''eau et cuire 20 min','Mixer finement','Ajouter la crème et le cumin'], NULL, ARRAY['végétarien','hiver','réconfortant']);

-- PLATS PRINCIPAUX suite (70-84)
INSERT INTO public.recipes (slug, name, description, ingredients, preparation_time, difficulty, category, image_emoji, instructions, tips, tags) VALUES
('blanquette-de-veau', 'Blanquette de veau', 'Ragoût de veau à la crème', ARRAY['veau','carotte','poireau','champignons','crème','citron'], 90, 'moyen', 'plat', '🥘', ARRAY['Couper le veau en morceaux','Le faire pocher dans l''eau','Ajouter les légumes coupés','Cuire 1h à feu doux','Préparer la sauce avec la crème et le citron','Servir avec du riz'], NULL, ARRAY['français','classique','mijoté']),
('hachis-parmentier', 'Hachis parmentier', 'Gratin de viande hachée et purée', ARRAY['viande hachée','pomme de terre','oignon','fromage','crème'], 50, 'facile', 'plat', '🥔', ARRAY['Préparer une purée de pommes de terre','Faire revenir la viande avec l''oignon','Disposer la viande dans un plat à gratin','Recouvrir de purée','Parsemer de fromage et gratiner 20 min'], NULL, ARRAY['français','familial','réconfortant']),
('gratin-de-pates', 'Gratin de pâtes', 'Pâtes gratinées au fromage', ARRAY['pâtes','béchamel','fromage','jambon','muscade'], 35, 'facile', 'plat', '🍝', ARRAY['Cuire les pâtes al dente','Préparer la béchamel','Mélanger pâtes, béchamel et jambon','Verser dans un plat, couvrir de fromage','Gratiner 15 min au four'], NULL, ARRAY['familial','réconfortant']),
('poulet-basquaise', 'Poulet basquaise', 'Poulet mijoté aux poivrons et tomates', ARRAY['poulet','poivron','tomate','oignon','ail','piment'], 55, 'moyen', 'plat', '🍗', ARRAY['Faire dorer les morceaux de poulet','Réserver et faire revenir les poivrons','Ajouter les tomates et l''oignon','Remettre le poulet','Laisser mijoter 40 min'], NULL, ARRAY['français','basque']),
('tajine-d-agneau', 'Tajine d''agneau', 'Tajine aux pruneaux et amandes', ARRAY['agneau','pruneaux','amandes','oignon','miel','épices'], 90, 'moyen', 'plat', '🥘', ARRAY['Faire revenir l''agneau','Ajouter les oignons et épices','Couvrir d''eau et mijoter 1h','Ajouter pruneaux et miel','Cuire encore 20 min','Garnir d''amandes grillées'], NULL, ARRAY['marocain','mijoté']),
('galette-bretonne-complete', 'Galette bretonne complète', 'Crêpe de sarrasin garnie', ARRAY['farine de sarrasin','oeufs','jambon','fromage','beurre'], 20, 'moyen', 'plat', '🥞', ARRAY['Préparer la pâte à galette','Cuire la galette sur une crêpière','Garnir de jambon et fromage','Casser un oeuf au centre','Replier les bords et servir'], NULL, ARRAY['français','breton']),
('poulet-au-citron', 'Poulet au citron', 'Poulet rôti parfumé au citron et herbes', ARRAY['poulet','citron','ail','romarin','huile d''olive','pomme de terre'], 50, 'facile', 'plat', '🍋', ARRAY['Mariner le poulet avec citron et romarin','Disposer dans un plat avec les pommes de terre','Arroser d''huile d''olive','Enfourner à 200°C pendant 40 min','Arroser régulièrement du jus'], NULL, ARRAY['méditerranéen','familial']),
('moules-marinieres', 'Moules marinières', 'Moules au vin blanc classiques', ARRAY['moules','vin blanc','oignon','ail','persil','beurre'], 25, 'facile', 'plat', '🦪', ARRAY['Nettoyer les moules','Faire revenir l''oignon et l''ail dans le beurre','Déglacer au vin blanc','Ajouter les moules et couvrir','Cuire 5-7 min jusqu''à ouverture','Parsemer de persil et servir avec des frites'], NULL, ARRAY['français','fruits de mer']),
('tarte-flambee', 'Tarte flambée', 'Flammekueche alsacienne', ARRAY['pâte à pizza','crème fraîche','oignon','lardons','fromage blanc'], 20, 'facile', 'plat', '🍕', ARRAY['Préchauffer le four à 250°C','Étaler finement la pâte','Mélanger crème et fromage blanc','Étaler sur la pâte','Ajouter oignons émincés et lardons','Cuire 10-12 min'], NULL, ARRAY['alsacien','français','rapide']),
('pot-au-feu', 'Pot-au-feu', 'Bouilli de boeuf aux légumes d''hiver', ARRAY['boeuf','carotte','poireau','navet','pomme de terre','oignon'], 180, 'facile', 'plat', '🍲', ARRAY['Mettre le boeuf dans l''eau froide','Porter à ébullition et écumer','Ajouter les légumes par étapes','Laisser mijoter 2h30 à feu doux','Servir la viande avec les légumes et le bouillon'], NULL, ARRAY['français','classique','hiver','mijoté']),
('escalope-milanaise', 'Escalope milanaise', 'Escalope panée à l''italienne', ARRAY['escalope de poulet','chapelure','oeufs','parmesan','citron'], 20, 'facile', 'plat', '🍗', ARRAY['Aplatir les escalopes','Paner: farine, oeuf, chapelure-parmesan','Faire frire dans l''huile chaude','Égoutter sur du papier absorbant','Servir avec du citron et des pâtes'], NULL, ARRAY['italien','rapide']),
('dahl-de-lentilles', 'Dahl de lentilles', 'Curry de lentilles indien', ARRAY['lentilles corail','oignon','tomate','lait de coco','curry','ail'], 35, 'facile', 'plat', '🍛', ARRAY['Faire revenir l''oignon et l''ail','Ajouter le curry et les tomates','Incorporer les lentilles et le lait de coco','Cuire 20-25 min','Servir avec du riz et de la coriandre'], NULL, ARRAY['indien','végétarien','vegan','healthy']),
('pates-au-pesto', 'Pâtes au pesto', 'Pâtes fraîches au pesto basilic', ARRAY['pâtes','pesto','parmesan','tomates cerises','pignons de pin'], 15, 'facile', 'plat', '🍝', ARRAY['Cuire les pâtes al dente','Couper les tomates cerises en deux','Égoutter les pâtes, mélanger avec le pesto','Ajouter les tomates et les pignons','Servir avec du parmesan râpé'], NULL, ARRAY['italien','rapide','végétarien']),
('bibimbap', 'Bibimbap', 'Bol coréen au riz et légumes', ARRAY['riz','boeuf','carotte','courgette','oeufs','sauce soja'], 35, 'moyen', 'plat', '🍚', ARRAY['Cuire le riz','Mariner et cuire le boeuf émincé','Sauter chaque légume séparément','Assembler dans un bol sur le riz','Ajouter un oeuf au plat et la sauce'], NULL, ARRAY['coréen','asiatique']),
('pates-alla-norma', 'Pâtes alla norma', 'Pâtes siciliennes aux aubergines', ARRAY['pâtes','aubergine','tomate','ricotta','basilic','ail'], 30, 'facile', 'plat', '🍆', ARRAY['Couper l''aubergine en cubes et la faire frire','Préparer la sauce tomate avec l''ail','Cuire les pâtes al dente','Mélanger pâtes, sauce et aubergines','Garnir de ricotta et basilic'], NULL, ARRAY['italien','végétarien','sicilien']);

-- SNACKS suite (85-88)
INSERT INTO public.recipes (slug, name, description, ingredients, preparation_time, difficulty, category, image_emoji, instructions, tips, tags) VALUES
('cake-sale', 'Cake salé', 'Cake aux olives et jambon', ARRAY['farine','oeufs','huile','jambon','olives','fromage'], 50, 'facile', 'snack', '🧁', ARRAY['Mélanger farine, oeufs, huile et lait','Couper le jambon et les olives','Incorporer à la pâte avec le fromage','Verser dans un moule à cake','Cuire 40 min à 180°C'], NULL, ARRAY['français','pique-nique','apéritif']),
('mini-quiches', 'Mini quiches', 'Petites quiches pour l''apéritif', ARRAY['pâte brisée','oeufs','crème','lardons','fromage'], 30, 'facile', 'snack', '🥧', ARRAY['Découper des ronds de pâte','Les disposer dans des moules à muffins','Mélanger oeufs, crème et lardons','Remplir les fonds de tarte','Cuire 15 min à 180°C'], NULL, ARRAY['français','apéritif']),
('batonnets-de-legumes-houmous', 'Bâtonnets de légumes & houmous', 'Crudités avec trempette', ARRAY['carotte','concombre','céleri','pois chiches','citron'], 15, 'facile', 'snack', '🥕', ARRAY['Couper les légumes en bâtonnets','Préparer le houmous maison','Disposer les crudités autour du dip','Servir frais'], NULL, ARRAY['healthy','végétarien','vegan']),
('pan-con-tomate', 'Pan con tomate', 'Toast espagnol à la tomate', ARRAY['pain','tomate','ail','huile d''olive','sel'], 5, 'facile', 'snack', '🍅', ARRAY['Griller le pain','Frotter avec une gousse d''ail','Frotter avec une demi-tomate','Arroser d''huile d''olive','Saler et servir'], NULL, ARRAY['espagnol','rapide','végétarien']);

-- DESSERTS suite (89-95)
INSERT INTO public.recipes (slug, name, description, ingredients, preparation_time, difficulty, category, image_emoji, instructions, tips, tags) VALUES
('gateau-au-yaourt', 'Gâteau au yaourt', 'Le gâteau le plus simple du monde', ARRAY['yaourt','farine','sucre','oeufs','huile','levure'], 40, 'facile', 'dessert', '🍰', ARRAY['Verser le yaourt dans un saladier','Utiliser le pot comme mesure','Mélanger 3 pots de farine, 2 de sucre, 1 d''huile','Ajouter les oeufs et la levure','Cuire 30 min à 180°C'], 'Le pot de yaourt sert de mesure pour tout !', ARRAY['français','familial','classique']),
('riz-au-lait', 'Riz au lait', 'Dessert crémeux à la vanille', ARRAY['riz','lait','sucre','vanille','cannelle'], 40, 'facile', 'dessert', '🍚', ARRAY['Rincer le riz','Chauffer le lait avec la vanille','Ajouter le riz et cuire à feu doux','Remuer régulièrement pendant 30 min','Sucrer et servir tiède ou froid'], NULL, ARRAY['français','réconfortant','classique']),
('brownie', 'Brownie', 'Gâteau au chocolat dense et fondant', ARRAY['chocolat','beurre','sucre','oeufs','farine','noix'], 35, 'facile', 'dessert', '🍫', ARRAY['Faire fondre le chocolat et le beurre','Battre les oeufs avec le sucre','Mélanger les deux préparations','Ajouter farine et noix','Cuire 20-25 min à 180°C (le centre doit rester fondant)'], NULL, ARRAY['américain','chocolat']),
('tarte-au-citron-meringuee', 'Tarte au citron meringuée', 'Tarte acidulée couverte de meringue', ARRAY['pâte sablée','citron','oeufs','sucre','beurre','maïzena'], 50, 'difficile', 'dessert', '🍋', ARRAY['Cuire le fond de tarte à blanc','Préparer la crème au citron (curd)','Verser sur le fond de tarte','Monter les blancs en meringue','Déposer la meringue et caraméliser au chalumeau'], NULL, ARRAY['français','pâtisserie','élégant']),
('compote-de-pommes', 'Compote de pommes', 'Compote maison toute simple', ARRAY['pomme','sucre','cannelle','citron'], 25, 'facile', 'dessert', '🍎', ARRAY['Éplucher et couper les pommes','Les cuire à feu doux avec un peu d''eau','Ajouter le sucre et la cannelle','Écraser ou mixer selon la texture voulue','Arroser d''un filet de citron'], NULL, ARRAY['français','healthy','enfant']),
('ile-flottante', 'Île flottante', 'Blancs en neige sur crème anglaise', ARRAY['oeufs','lait','sucre','vanille'], 30, 'moyen', 'dessert', '🍮', ARRAY['Préparer la crème anglaise avec jaunes, lait et sucre','Monter les blancs en neige ferme','Les pocher dans du lait chaud','Déposer sur la crème anglaise','Napper de caramel'], NULL, ARRAY['français','classique','élégant']),
('mug-cake-chocolat', 'Mug cake chocolat', 'Gâteau express au micro-ondes', ARRAY['farine','chocolat','oeufs','sucre','beurre'], 5, 'facile', 'dessert', '☕', ARRAY['Mélanger tous les ingrédients dans un mug','Cuire 1 min 30 au micro-ondes','Laisser tiédir 1 min','Déguster directement dans le mug'], NULL, ARRAY['rapide','chocolat','express']);

-- BOISSONS suite (96-100)
INSERT INTO public.recipes (slug, name, description, ingredients, preparation_time, difficulty, category, image_emoji, instructions, tips, tags) VALUES
('the-glace-peche', 'Thé glacé pêche', 'Thé glacé rafraîchissant aux pêches', ARRAY['thé','pêche','sucre','citron','menthe'], 15, 'facile', 'boisson', '🍑', ARRAY['Infuser le thé et le laisser refroidir','Mixer les pêches','Mélanger le thé, la purée de pêche et le sucre','Ajouter le jus de citron','Servir avec des glaçons et de la menthe'], NULL, ARRAY['été','rafraîchissant']),
('milkshake-vanille', 'Milkshake vanille', 'Milkshake crémeux à la vanille', ARRAY['glace','lait','vanille','crème chantilly'], 5, 'facile', 'boisson', '🥛', ARRAY['Mixer la glace avec le lait','Ajouter la vanille','Mixer jusqu''à consistance lisse','Servir avec de la chantilly'], NULL, ARRAY['sucré','rapide','américain']),
('lassi-a-la-mangue', 'Lassi à la mangue', 'Boisson indienne au yaourt et mangue', ARRAY['mangue','yaourt','lait','sucre','cardamome'], 5, 'facile', 'boisson', '🥭', ARRAY['Mixer la mangue avec le yaourt','Ajouter le lait et le sucre','Parfumer à la cardamome','Servir très frais'], NULL, ARRAY['indien','rafraîchissant']),
('eau-aromatisee-concombre-menthe', 'Eau aromatisée concombre-menthe', 'Eau infusée détox et rafraîchissante', ARRAY['concombre','menthe','citron','gingembre'], 5, 'facile', 'boisson', '💧', ARRAY['Couper le concombre en rondelles','Ajouter les feuilles de menthe','Presser le citron et râper le gingembre','Verser de l''eau fraîche','Laisser infuser 30 min au frigo'], NULL, ARRAY['détox','healthy','été']),
('chai-latte', 'Chaï latte', 'Thé épicé indien au lait', ARRAY['thé noir','lait','cannelle','gingembre','cardamome','miel'], 10, 'facile', 'boisson', '☕', ARRAY['Faire infuser le thé avec les épices','Chauffer le lait','Mélanger thé épicé et lait chaud','Sucrer avec le miel','Saupoudrer de cannelle'], NULL, ARRAY['indien','hiver','réconfortant']);
