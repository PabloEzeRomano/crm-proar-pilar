-- 0055_normalize_industry.sql
--
-- 1. Adds `subindustry TEXT` to prospects.
-- 2. Extracts sub-category from original `industry` into `subindustry`:
--      parenthetical → inner text  ("Alimentos (Frutas)" → "Frutas")
--      no parentheses → full value ("Agroquímicos" → "Agroquímicos")
-- 3. Normalises `industry` to 26 canonical categories.
-- 4. Clears `subindustry` where it now duplicates the canonical (no new info).
-- Idempotent: safe to re-run.

BEGIN;

-- ── Step 1: add column ────────────────────────────────────────────────────────
ALTER TABLE public.prospects
  ADD COLUMN IF NOT EXISTS subindustry TEXT;

-- ── Step 2: preserve original value in subindustry ───────────────────────────
UPDATE public.prospects
SET subindustry = industry
WHERE industry IS NOT NULL
  AND subindustry IS NULL;

-- Simplify parenthetical entries to just the inner content
UPDATE public.prospects
SET subindustry = TRIM(SUBSTRING(industry FROM '\((.+)\)'))
WHERE industry ~ '\(.+\)';

-- ── Step 3: normalise industry ───────────────────────────────────────────────

-- Agro
UPDATE public.prospects SET industry = 'Agro'
WHERE industry IN (
  'Agro', 'agro', 'Agro Estimulantes', 'AgroAlimentos',
  'agroproductos', 'Agroproductos',
  'Agroproductos (Herbicida, Insecticida y Fungicida)',
  'Agroproductos (inoculantes Semillas)',
  'Agroproductos (Inoculantes)',
  'Agroproductos (Maíz)',
  'Agroproductos (semillas)',
  'Agroproductos (Semillas)',
  'Agroproductos / Administración proyectos agrícolas',
  'Agroquímicos',
  'Agroquímicos, Biocombustibles, Biodiesel',
  'Agricultura (Servicio)',
  'Cerealera',
  'Fertilizantes, Producción',
  'Nutrición Animal',
  'PRODUCCIÓN DE SEMILLAS',
  'Semillas',
  'Semillas, legumbres, frutos secos',
  'productos fitosanitarios'
);

-- Frigorífico
UPDATE public.prospects SET industry = 'Frigorífico'
WHERE industry IN (
  'Frigorífico', 'Avícola', 'Avícola (Frigorífico)', 'Avícola y Alimentos',
  'Alimentos (Avícola)',
  'Alimentos (Fiambres y Embutidos)',
  'Alimentos (Frigorífico -Fiambres y Embutidos)',
  'Alimentos (Frigorífico de pollos y alimento balanceados,  avicola)',
  'Alimentos (Frigorífico)',
  'Alimentos (Marítima)',
  'Alimentos (milanesas congeladas)',
  'Carnes / Margarina', 'Carnes, Producción',
  'Frigorífico (embutidos al vacío)', 'Frigorífico (supercongelados)',
  'Frigorífico Aves', 'Pescados'
);

-- Lácteos
UPDATE public.prospects SET industry = 'Lácteos'
WHERE industry IN (
  'Lácteos', 'Quesos',
  'Alimentos (Ingredientes Lácteos, Producción)',
  'Alimentos (Insumos Industria Láctea)',
  'Alimentos (lácteos)', 'Alimentos (Lácteos)',
  'Alimentos (Producción de quesos)',
  'Alimentos (Quesos, Yogurth, Mermeladas)',
  'Alimentos (quesos)', 'Alimentos (Quesos)'
);

-- Panificados
UPDATE public.prospects SET industry = 'Panificados'
WHERE industry IN (
  'Panificados', 'panificados', 'Panificados (pizzas supercong))',
  'Alimentos (Panificados - Galletitas)',
  'Alimentos (panificados)', 'Alimentos (Panificados)'
);

-- Alimentos
UPDATE public.prospects SET industry = 'Alimentos'
WHERE industry IN (
  'Alimentos', 'Aditivos Alimentos', 'Alfajores',
  'Aliemntos (Nutrición animal)', 'Aliemtos (Bebidas)',
  'Alimentos (Aceite de Oliva, Vino, Uva, Aceituna)',
  'Alimentos (Aceitera)', 'Alimentos (Aceituna, Aceite de Oliva)',
  'Alimentos (aderezos)', 'Alimentos (Aderezos)', 'Alimentos (Arroz)',
  'Alimentos (barras de cereal)', 'Alimentos (Bebidas alcohólicas)',
  'Alimentos (bebidas de frutas)', 'Alimentos (Bebidas, Jugos de Fruta)',
  'Alimentos (bebidas)', 'Alimentos (Bebidas)', 'Alimentos (catering)',
  'Alimentos (Cereales desayuno)', 'Alimentos (Cerezas / Cherries)',
  'Alimentos (chocolate)', 'Alimentos (Chocolate)', 'Alimentos (Congelados)',
  'Alimentos (Dietética-Distribuidor)', 'Alimentos (Dietética)',
  'Alimentos (edulcorante)', 'Alimentos (Esencias y Fragancias)',
  'Alimentos (especias)',
  'Alimentos (Frutas y Verduras congeladas)', 'Alimentos (Frutas, verduras y Hortalizas)',
  'Alimentos (frutas)', 'Alimentos (Frutas)',
  'Alimentos (Galletitas)', 'Alimentos (gastronomía)', 'Alimentos (Gastronomía)',
  'Alimentos (golosinas)', 'Alimentos (Golosinas)', 'Alimentos (Grasas y Aceites)',
  'Alimentos (helados)', 'Alimentos (Helados)', 'Alimentos (jugos en polvo)',
  'Alimentos (Mayorista / Frutos secos)', 'Alimentos (miel)',
  'Alimentos (Nutrición Animal)', 'Alimentos (Nutrición)',
  'Alimentos (pastas frescas)', 'Alimentos (Pastas frescas)',
  'Alimentos (pastas secas)', 'Alimentos (Pastas secas)', 'Alimentos (pastas)',
  'Alimentos (Polvos para preparar)', 'Alimentos (Poroto, Soja, Mani)',
  'Alimentos (snacks)', 'Alimentos (Snacks)', 'Alimentos (té)',
  'Alimentos (Vegetales congelados)', 'Alimentos (Verduras congeladas)',
  'Alimentos p/mascotas', 'Alimentos para mascotas', 'Alimentos para Mascotas',
  'Alimentos procesados', 'Alimentos varios', 'Alimentos varios (aderezos)',
  'Alimentos varios (producción a fasón)',
  'Bebidas', 'Bebidas / Aderezos / Saborizantes', 'Chocolates', 'Especias',
  'Farináceos', 'Frutas - Verduras', 'Golosinas y Confituras', 'Helados', 'Hielo',
  'Ingredientes Alimenticios', 'Ingredientes Alimentos',
  'Jugos (líquidos y en polvo)', 'm.p. para Alimentos p/mascotas',
  'Molino Harinero', 'Pastas', 'Sabores y Fragancias',
  'Sal, Producción, Comercialización', 'Servicio de catering'
);

-- Automotriz
UPDATE public.prospects SET industry = 'Automotriz'
WHERE industry IN (
  'Automotriz', 'AUTOM', 'Autopartes', 'Autopartes (engranajes)',
  'autopartes plásticos', 'Autopartes, Mecánica General, Producción',
  'Autopartes, Producción',
  'Ejes para Camiones y Micros, Ejes para Camiones y Micros, Me',
  'Fabricación de Paragolpes, Producción',
  'Industria automotriz, Camiones y camionetas, Producción, Exp',
  'Industria Automotriz, Metalúrgica, Producción, Importación,',
  'Industria Automotriz, Producción, Exportación, Importación',
  'Industria Autopartista, Producción, Comercialización'
);

-- Caucho / Neumáticos
UPDATE public.prospects SET industry = 'Caucho / Neumáticos'
WHERE industry IN (
  'Caucho / Neumáticos', 'Caucho', 'Industria del Caucho',
  'Neumáticos', 'Neumáticos, Mangueras, Filtros, Producción', 'Pisos de Goma'
);

-- Construcción
UPDATE public.prospects SET industry = 'Construcción'
WHERE industry IN (
  'Construcción', 'Aislante térmico', 'Cerámica',
  'Fabricación de morteros, Producción', 'Griferías',
  'Ingeniería industrial, Construcciones, Producción',
  'Materiales p/ Construcción', 'materiales para la constrtucción',
  'Materiales para la construcción', 'Materiales para la construcción (Ladrillos)',
  'membranas', 'Placas de Yeso, Producción, Comercialización',
  'Productos de Ingeniería P/ Construcción, Producción',
  'productos para la construcción', 'Tanques de agua', 'Vidrios'
);

-- Cosmética
UPDATE public.prospects SET industry = 'Cosmética'
WHERE industry IN (
  'Cosmética', 'COSME', 'Cosmetica', 'Cosmética (Shampoos, Talcos, Perfumes)',
  'Cosmetica (Tercerizan en THERABEL PHARMA)',
  'Cosmetica (Tercerizan la producción)',
  'Artículos de Higiene Personal, Cosmética, Producción, Comerc',
  'Esmaltes para uñas Acetonas', 'Línea de Tocador y Fragancias, Producción'
);

-- Electricidad
UPDATE public.prospects SET industry = 'Electricidad'
WHERE industry IN (
  'Electricidad', 'Baterías', 'CABLE', 'Cables eléctricos', 'Capacitores',
  'Conductores Eléctricos', 'ELECT', 'Electrodomésticos',
  'Electromecánica, Producción, Servicios',
  'Equipamientos Eléctricos, Comercialización', 'Iluminación',
  'Lámparas eléctricas, Electricidad, Producción',
  'Pilas y Baterias Eléctricas, Linternas, Producción'
);

-- Energía
UPDATE public.prospects SET industry = 'Energía'
WHERE industry IN (
  'Energía', 'Gas propáno, Producción, Servicios, Distribución',
  'Gases industriales y Medicinales, Producción',
  'Gases Medicinales e Industriales, Producción',
  'Petroquímica, Combustibles, Producción', 'Petroquímica, Producción'
);

-- Farmacéutica
UPDATE public.prospects SET industry = 'Farmacéutica'
WHERE industry IN (
  'Farmacéutica', 'Farmaceutica', 'Farmacéutico', 'Lab / Farm',
  'Laboratorio de Espec. Medicinales, Laboratorio de productos',
  'Laboratorio de Espec. Medicinales, Producción',
  'Laboratorio de productos medicinales',
  'Laboratorio de productos medicinales, Producción',
  'Laboratorio de Productos Medicinales, Producción',
  'Laboratorio de productos medicinales, Producción, Exportació',
  'laboratorio farmacéutico', 'Laboratorio farmacéutico', 'Laboratorio Farmacéutico',
  'Neurociencia', 'Prod. Farmacéuticos, Producción',
  'Productos Biomédicos', 'Tecnología Médica'
);

-- Gráfica
UPDATE public.prospects SET industry = 'Gráfica'
WHERE industry IN (
  'Gráfica', 'Etiquetas', 'Etiquetas, ribbons',
  'GRAF', 'GRAFIC', 'Grafica', 'Gráfica (Packaginig)', 'IMPRE'
);

-- Laboratorio
UPDATE public.prospects SET industry = 'Laboratorio'
WHERE industry IN (
  'Laboratorio', 'Equipamiento para laboratorios',
  'Laborarotorio (Tocoferoles, Vitamina E, Fitoesteroles, Producción)'
);

-- Logística
UPDATE public.prospects SET industry = 'Logística'
WHERE industry IN (
  'Logística', 'Correo Postal', 'LOGIST'
);

-- Maquinaria Industrial
UPDATE public.prospects SET industry = 'Maquinaria Industrial'
WHERE industry IN (
  'Maquinaria Industrial', 'Automatización Industrial, Producción',
  'Equipamiento Gastronómico',
  'Máq.de empaque de prod.farmacéuticos, Producción',
  'Maquinaria y accesorios p/ind. petrolera, Metalmecánica, Pro',
  'Máquinas industriales, Producción', 'Máquinas, Herramientas',
  'Sistemas de Automatizacion, Producción'
);

-- Metalúrgica
UPDATE public.prospects SET industry = 'Metalúrgica'
WHERE industry IN (
  'Metalúrgica', 'Accesorios para la Industria',
  'Accesorios para la Industria (Petrolera)',
  'Acería. Acero Inoxidable, Importación', 'bombas',
  'Caños, Aluminio, cobre y bronce, Producción',
  'Cilindros, Producción (Revestimientos para rodillos gráficos)',
  'Componentes mecánicos de precisión, Producción, Comercializa',
  'CORREAS DE TRANS', 'Cromado y Pintura Industrial', 'Cubiertos',
  'Equipamiento Industria', 'Equipamientos para la industria',
  'Equipos de Refrigeración',
  'Fabricación de Hierros Laminados, Fundición de hierro y Acer',
  'Ferroaliaciones, Producción', 'Filtros Industriales', 'Herramientas',
  'Industria Metalúrgica, Rulemanes, Juntas y Bujías, Producció',
  'Instrumentos de medición', 'Llaves y Cerraduras',
  'Pistones de aluminio, Producción',
  'TUBER', 'Tubos - Chapas - Flejes', 'Tubos y accesorios',
  'Tubos y Conexiones', 'Válvulas', 'Valvulas y accesorios'
);

-- Nutrición / Salud
UPDATE public.prospects SET industry = 'Nutrición / Salud'
WHERE industry IN (
  'Nutrición / Salud', 'Nutrición', 'Salud',
  'Productos Naturales para la salud, Producción, Importación'
);

-- Packaging / Envases
UPDATE public.prospects SET industry = 'Packaging / Envases'
WHERE industry IN (
  'Packaging / Envases', 'Barbijos y Bolsas ecológicas',
  'Bolsas Industriales, Producción', 'embalajes rígidos y flexibles plásticos',
  'ENVA', 'Envases', 'Envases metálicos', 'Envases Metálicos',
  'Packaging', 'Packaging (envase Aerosoles)', 'Packaging (envases aerosoles)',
  'Packaging (Envases de Hojalata)', 'Packaging (vasos de plásticos)',
  'Packaging (vasos)', 'Pomos de aluminio colapsibles (tubos de aluminio)',
  'Servicio (Packaging)', 'Servicio Empaques', 'Servicios integrales de Packaging'
);

-- Papelera
UPDATE public.prospects SET industry = 'Papelera'
WHERE industry IN (
  'Papelera', 'Celulosa y Papel, Producción, Exportación',
  'Fabricación de Pastas Celulósicas, Aserradero Industrial, Fo',
  'papelera', 'PApelera', 'Productos descartables de celulosa'
);

-- Pinturas
UPDATE public.prospects SET industry = 'Pinturas'
WHERE industry IN (
  'Pinturas', 'Fabricación de Pinturas y Lacas, Producción',
  'pinturas', 'Pinturas y materiales para la construcción'
);

-- Plásticos
UPDATE public.prospects SET industry = 'Plásticos'
WHERE industry IN (
  'Plásticos', 'Acrílicos, Construcciones, Producción',
  'Film de Polietileno, Producción', 'Films', 'plasticos',
  'Plásticos (bazar)', 'Plásticos (bolsas de PE)',
  'plásticos (contenedores, metalurgica, mobiliarios)',
  'Plásticos (Juguetes)', 'plásticos (polímeros, resinas)',
  'Plasticos (Poliuretano)', 'Plásticos (productos varios)',
  'Plásticos (Propileno y Poliamido Biorientado)', 'Plásticos (vajillas)',
  'plásticos colorantes pigmentos',
  'Plásticos Industriales, Acrílicos, Polipropileno, Polietilen',
  'Plásticos, Producción', 'VARIOS PVC'
);

-- Química
UPDATE public.prospects SET industry = 'Química'
WHERE industry IN (
  'Química', 'ADHES', 'Colorantes, Pigmentos, Producción, Exportación',
  'Enzimas', 'Industria Química', 'Látex, Producción, Comercialización',
  'Productos de Limpieza', 'Productos Químicos', 'Productos Químicos y dispensers',
  'Productos químicos,', 'Química (adhesivos)', 'Química (Alcohol)',
  'Química (catalizadores)', 'Química (Cloro)', 'Química (Importadores)',
  'Química (Lubricantes, Aceites)', 'Química (Lubricantes)',
  'Química (para la construcción)', 'Química (Pegamentos, adhesivos, hotmelt)',
  'Química, Producción', 'Quimicos', 'Químicos', 'Químicos (Adhesivos)',
  'Químicos (Herbicida, Insecticida y Fungicida)',
  'Químicos (Trat de efluentes)', 'Químicos de Limpieza'
);

-- Textil
UPDATE public.prospects SET industry = 'Textil'
WHERE industry IN (
  'Textil', 'Cordón', 'TEXTI', 'Textil (medias ortopédicas)', 'Textil (medias)'
);

-- Veterinaria
UPDATE public.prospects SET industry = 'Veterinaria'
WHERE industry IN (
  'Veterinaria', 'Lab-Veterinaria, Producción',
  'Lab. Veterinarios', 'Laboratorio Veterinario'
);

-- Otros
UPDATE public.prospects SET industry = 'Otros'
WHERE industry IN (
  'Otros', 'ALMAS', 'Artículos Escolares', 'Bicicletas', 'Consultora',
  'dispenser de agua y purificadorees', 'Elementos de Seguridad',
  'Entradas para espectáculos', 'Exhibidores', 'Insumos para oficinas',
  'Investigación y Desarrollo', 'Joyas', 'Juguetes',
  'línea de producción de grabado con láser', 'Maderera (Muebles)',
  'MALEC', 'Matafuegos', 'Mayorista', 'Municipalidad',
  'NOIDE', 'OTALI', 'PROIN', 'Productora de Diseño', 'SNASA',
  'SOLUCIONES CONCRETAS PARA MINIMIZAR LOS IMPACTOS NOCIVOS GENERADOS POR LOS RESIDUOS SÓLIDOS URBANOS',
  'Tabacalera, Producción, Exportación, Importación', 'Varios'
);

-- ── Step 4: clear subindustry where it duplicates the canonical ───────────────
-- e.g. "Farmacéutica" → industry="Farmacéutica", subindustry="Farmacéutica" → NULL
-- e.g. "Alimentos (Lácteos)" → industry="Lácteos", subindustry="Lácteos" → NULL
-- e.g. "Agroquímicos" → industry="Agro", subindustry="Agroquímicos" → kept ✓
UPDATE public.prospects
SET subindustry = NULL
WHERE subindustry IS NOT NULL
  AND subindustry = industry;

COMMIT;
