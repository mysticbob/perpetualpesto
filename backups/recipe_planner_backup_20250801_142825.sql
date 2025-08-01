--
-- PostgreSQL database dump
--

-- Dumped from database version 15.13
-- Dumped by pg_dump version 15.13

-- Started on 2025-08-01 18:28:25 UTC

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

DROP DATABASE IF EXISTS recipe_planner;
--
-- TOC entry 3558 (class 1262 OID 16384)
-- Name: recipe_planner; Type: DATABASE; Schema: -; Owner: -
--

CREATE DATABASE recipe_planner WITH TEMPLATE = template0 ENCODING = 'UTF8' LOCALE_PROVIDER = libc LOCALE = 'en_US.utf8';


\connect recipe_planner

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- TOC entry 5 (class 2615 OID 16448)
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--

-- *not* creating schema, since initdb creates it


--
-- TOC entry 3559 (class 0 OID 0)
-- Dependencies: 5
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON SCHEMA public IS '';


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- TOC entry 214 (class 1259 OID 16449)
-- Name: _prisma_migrations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public._prisma_migrations (
    id character varying(36) NOT NULL,
    checksum character varying(64) NOT NULL,
    finished_at timestamp with time zone,
    migration_name character varying(255) NOT NULL,
    logs text,
    rolled_back_at timestamp with time zone,
    started_at timestamp with time zone DEFAULT now() NOT NULL,
    applied_steps_count integer DEFAULT 0 NOT NULL
);


--
-- TOC entry 224 (class 1259 OID 16539)
-- Name: depleted_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.depleted_items (
    id text NOT NULL,
    "userId" text NOT NULL,
    name text NOT NULL,
    "lastAmount" text NOT NULL,
    unit text NOT NULL,
    category text,
    "depletedDate" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "timesUsed" integer DEFAULT 1 NOT NULL,
    "isFrequentlyUsed" boolean DEFAULT false NOT NULL
);


--
-- TOC entry 223 (class 1259 OID 16530)
-- Name: grocery_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.grocery_items (
    id text NOT NULL,
    "userId" text NOT NULL,
    name text NOT NULL,
    amount text,
    unit text,
    category text,
    completed boolean DEFAULT false NOT NULL,
    "addedDate" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- TOC entry 219 (class 1259 OID 16499)
-- Name: ingredients; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ingredients (
    id text NOT NULL,
    "recipeId" text NOT NULL,
    name text NOT NULL,
    amount text,
    unit text,
    "order" integer NOT NULL
);


--
-- TOC entry 220 (class 1259 OID 16506)
-- Name: instructions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.instructions (
    id text NOT NULL,
    "recipeId" text NOT NULL,
    step text NOT NULL,
    "order" integer NOT NULL
);


--
-- TOC entry 225 (class 1259 OID 16549)
-- Name: meal_plans; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.meal_plans (
    id text NOT NULL,
    "userId" text NOT NULL,
    "recipeId" text NOT NULL,
    date timestamp(3) without time zone NOT NULL,
    "mealType" text NOT NULL,
    servings integer,
    notes text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- TOC entry 222 (class 1259 OID 16522)
-- Name: pantry_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pantry_items (
    id text NOT NULL,
    "userId" text NOT NULL,
    "locationId" text NOT NULL,
    name text NOT NULL,
    amount text NOT NULL,
    unit text NOT NULL,
    category text,
    "expirationDate" timestamp(3) without time zone,
    "addedDate" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- TOC entry 221 (class 1259 OID 16513)
-- Name: pantry_locations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pantry_locations (
    id text NOT NULL,
    "userId" text NOT NULL,
    name text NOT NULL,
    "order" integer DEFAULT 0 NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- TOC entry 217 (class 1259 OID 16480)
-- Name: recipes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.recipes (
    id text NOT NULL,
    name text NOT NULL,
    description text,
    "prepTime" integer,
    "cookTime" integer,
    "totalTime" integer,
    servings integer,
    difficulty text,
    "imageUrl" text,
    "sourceUrl" text,
    "createdBy" text,
    "isPublic" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- TOC entry 216 (class 1259 OID 16468)
-- Name: user_preferences; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_preferences (
    id text NOT NULL,
    "userId" text NOT NULL,
    "unitSystem" text DEFAULT 'metric'::text NOT NULL,
    "themeMode" text DEFAULT 'system'::text NOT NULL,
    language text DEFAULT 'en'::text NOT NULL,
    timezone text DEFAULT 'UTC'::text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- TOC entry 218 (class 1259 OID 16489)
-- Name: user_recipes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_recipes (
    id text NOT NULL,
    "userId" text NOT NULL,
    "recipeId" text NOT NULL,
    "customServings" integer,
    "customNotes" text,
    "isFavorite" boolean DEFAULT false NOT NULL,
    "timesCooked" integer DEFAULT 0 NOT NULL,
    "lastCookedAt" timestamp(3) without time zone,
    "addedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- TOC entry 226 (class 1259 OID 16557)
-- Name: user_stores; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_stores (
    id text NOT NULL,
    "userId" text NOT NULL,
    name text NOT NULL,
    "storeType" text NOT NULL,
    website text,
    "logoUrl" text,
    "isEnabled" boolean DEFAULT true NOT NULL,
    "deliveryTime" text,
    "minOrder" text,
    "deliveryFee" text,
    "order" integer DEFAULT 0 NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- TOC entry 215 (class 1259 OID 16460)
-- Name: users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.users (
    id text NOT NULL,
    email text NOT NULL,
    name text,
    avatar text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- TOC entry 3540 (class 0 OID 16449)
-- Dependencies: 214
-- Data for Name: _prisma_migrations; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public._prisma_migrations (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count) FROM stdin;
1b6a3339-54c4-4174-bf5d-2797a53b0731	b802472751eb34cb0c7422ebd7252fb640b431937d301d0b51e141922dfce42e	2025-08-01 16:22:17.643514+00	20250801162217_multi_user_support	\N	\N	2025-08-01 16:22:17.594284+00	1
\.


--
-- TOC entry 3550 (class 0 OID 16539)
-- Dependencies: 224
-- Data for Name: depleted_items; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.depleted_items (id, "userId", name, "lastAmount", unit, category, "depletedDate", "timesUsed", "isFrequentlyUsed") FROM stdin;
\.


--
-- TOC entry 3549 (class 0 OID 16530)
-- Dependencies: 223
-- Data for Name: grocery_items; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.grocery_items (id, "userId", name, amount, unit, category, completed, "addedDate", "updatedAt") FROM stdin;
cmdt19t1t001y69plcvm1znw6	cmdt19t0e000069pluhovz76n	Parmesan Cheese	200	g	dairy	f	2025-08-01 16:23:56.753	2025-08-01 16:23:56.753
cmdt19t1t001x69pla7g6x770	cmdt19t0m000269plq196s25s	Broccoli	1	head	vegetables	f	2025-08-01 16:23:56.753	2025-08-01 16:23:56.753
cmdt19t1t001z69plecub8r86	cmdt19t0e000069pluhovz76n	Pancetta	150	g	meat	f	2025-08-01 16:23:56.753	2025-08-01 16:23:56.753
1754070574898aqvry22oz	JP91MWFXuKUQCBV9NdK1FVN5cR32	Bread	1	loaf	grains	t	2025-08-01 17:49:34.898	2025-08-01 18:21:05.215
1754070574898jhoqjy7x4	JP91MWFXuKUQCBV9NdK1FVN5cR32	Bananas	6	pieces	vegetables	t	2025-08-01 17:49:34.898	2025-08-01 18:21:05.216
17540705748985nxjxjjnz	JP91MWFXuKUQCBV9NdK1FVN5cR32	Greek Yogurt	1	container	dairy	t	2025-08-01 17:49:34.898	2025-08-01 18:21:05.217
17540705748981c232abse	JP91MWFXuKUQCBV9NdK1FVN5cR32	Salmon Fillets	1	lb	meat	t	2025-08-01 17:49:34.898	2025-08-01 18:21:05.218
1754070574898t70mkamwe	JP91MWFXuKUQCBV9NdK1FVN5cR32	Broccoli	1	head	vegetables	f	2025-08-01 17:49:34.898	2025-08-01 18:21:05.218
1754070574898ms3a6259m	JP91MWFXuKUQCBV9NdK1FVN5cR32	Lemons	3	pieces	vegetables	t	2025-08-01 17:49:34.898	2025-08-01 18:21:05.219
17540705748984yjgk149e	JP91MWFXuKUQCBV9NdK1FVN5cR32	Butter	1	stick	dairy	t	2025-08-01 17:49:34.898	2025-08-01 18:21:05.22
cmdt19t1t002069pl64sjc8zt	cmdt19t0m000269plq196s25s	Ginger	1	piece	aromatics	t	2025-08-01 16:23:56.753	2025-08-01 16:23:56.753
\.


--
-- TOC entry 3545 (class 0 OID 16499)
-- Dependencies: 219
-- Data for Name: ingredients; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.ingredients (id, "recipeId", name, amount, unit, "order") FROM stdin;
cmdt19t15000f69plwu1qjz3a	cmdt19t15000e69plc0b1m3m5	spaghetti	400	g	1
cmdt19t15000g69pldkfydzdw	cmdt19t15000e69plc0b1m3m5	pancetta	150	g	2
cmdt19t15000h69plli31u4tg	cmdt19t15000e69plc0b1m3m5	eggs	3	pieces	3
cmdt19t15000i69pl3k8i7kzo	cmdt19t15000e69plc0b1m3m5	parmesan cheese	100	g	4
cmdt19t15000j69plo8oxgx5o	cmdt19t15000e69plc0b1m3m5	black pepper	1	tsp	5
cmdt19t15000k69pl70on1a4v	cmdt19t15000e69plc0b1m3m5	salt	1	tsp	6
cmdt19t1a000s69pllsd9w62z	cmdt19t1a000r69plga5g8hps	chicken breast	500	g	1
cmdt19t1a000t69plhqljxza8	cmdt19t1a000r69plga5g8hps	bell peppers	2	pieces	2
cmdt19t1a000u69pl63kuby2m	cmdt19t1a000r69plga5g8hps	broccoli	1	head	3
cmdt19t1a000v69pltkv6cxwi	cmdt19t1a000r69plga5g8hps	carrots	2	pieces	4
cmdt19t1a000w69pl981z5hlq	cmdt19t1a000r69plga5g8hps	soy sauce	3	tbsp	5
cmdt19t1a000x69plzx2inupj	cmdt19t1a000r69plga5g8hps	garlic	3	cloves	6
cmdt19t1a000y69plpge88l4m	cmdt19t1a000r69plga5g8hps	ginger	1	tbsp	7
cmdt19t1a000z69plm0zuv4c1	cmdt19t1a000r69plga5g8hps	olive oil	2	tbsp	8
cmdt418qx0002bf2nuca0vbdb	cmdt418qx0001bf2nv19v2gea	Test ingredient	1	cup	0
\.


--
-- TOC entry 3546 (class 0 OID 16506)
-- Dependencies: 220
-- Data for Name: instructions; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.instructions (id, "recipeId", step, "order") FROM stdin;
cmdt19t15000l69plk8imn8yh	cmdt19t15000e69plc0b1m3m5	Bring a large pot of salted water to boil. Cook spaghetti according to package directions.	1
cmdt19t15000m69pldhipim0l	cmdt19t15000e69plc0b1m3m5	While pasta cooks, dice pancetta and cook in a large skillet until crispy.	2
cmdt19t15000n69plk3iynu4q	cmdt19t15000e69plc0b1m3m5	In a bowl, whisk together eggs, parmesan, and black pepper.	3
cmdt19t15000o69plh8bp1zgk	cmdt19t15000e69plc0b1m3m5	Drain pasta, reserving 1 cup pasta water. Add hot pasta to pancetta.	4
cmdt19t15000p69plo77klhh2	cmdt19t15000e69plc0b1m3m5	Remove from heat and quickly stir in egg mixture, adding pasta water as needed.	5
cmdt19t15000q69plgt3ywcbl	cmdt19t15000e69plc0b1m3m5	Serve immediately with extra parmesan and black pepper.	6
cmdt19t1a001069plvkrdz3ft	cmdt19t1a000r69plga5g8hps	Cut chicken into bite-sized pieces and season with salt and pepper.	1
cmdt19t1a001169pl812qeyz4	cmdt19t1a000r69plga5g8hps	Chop all vegetables into uniform pieces.	2
cmdt19t1a001269pl9ufuhu1d	cmdt19t1a000r69plga5g8hps	Heat oil in a large wok or skillet over high heat.	3
cmdt19t1a001369plpjsdiv24	cmdt19t1a000r69plga5g8hps	Cook chicken until golden brown, about 5-6 minutes.	4
cmdt19t1a001469plhqttoknz	cmdt19t1a000r69plga5g8hps	Add vegetables and stir-fry for 3-4 minutes until crisp-tender.	5
cmdt19t1a001569ploilr0gcd	cmdt19t1a000r69plga5g8hps	Add garlic, ginger, and soy sauce. Stir-fry for 1 more minute.	6
cmdt19t1a001669plv8q6qncg	cmdt19t1a000r69plga5g8hps	Serve immediately over rice or noodles.	7
cmdt418qx0003bf2nxz33x1c0	cmdt418qx0001bf2nv19v2gea	Test step	0
\.


--
-- TOC entry 3551 (class 0 OID 16549)
-- Dependencies: 225
-- Data for Name: meal_plans; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.meal_plans (id, "userId", "recipeId", date, "mealType", servings, notes, "createdAt", "updatedAt") FROM stdin;
cmdt19t1w002969plu3h6gbqs	cmdt19t0m000269plq196s25s	cmdt19t1a000r69plga5g8hps	2025-08-02 16:23:56.756	lunch	3	Meal prep for the week	2025-08-01 16:23:56.757	2025-08-01 16:23:56.757
cmdt19t1w002a69plc6gzgpm1	cmdt19t0e000069pluhovz76n	cmdt19t15000e69plc0b1m3m5	2025-08-01 16:23:56.756	dinner	6	Family dinner - make extra for leftovers	2025-08-01 16:23:56.757	2025-08-01 16:23:56.757
\.


--
-- TOC entry 3548 (class 0 OID 16522)
-- Dependencies: 222
-- Data for Name: pantry_items; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.pantry_items (id, "userId", "locationId", name, amount, unit, category, "expirationDate", "addedDate", "updatedAt") FROM stdin;
cmdt19t1h001i69plvw5vfmcl	cmdt19t0e000069pluhovz76n	cmdt19t0p000569pljj5hzs9q	Spaghetti	500	g	grains	2026-01-01 00:00:00	2025-08-01 16:23:56.742	2025-08-01 16:23:56.742
cmdt19t1h001k69pl13sveioc	cmdt19t0e000069pluhovz76n	cmdt19t0p000569pljj5hzs9q	Olive Oil	500	ml	oils	2025-12-01 00:00:00	2025-08-01 16:23:56.742	2025-08-01 16:23:56.742
cmdt19t1h001j69plp9vjt1tz	cmdt19t0e000069pluhovz76n	cmdt19t11000769pl156tg70h	Eggs	12	pieces	dairy	2025-02-15 00:00:00	2025-08-01 16:23:56.742	2025-08-01 16:23:56.742
cmdt19t1p001m69plscrvtjft	cmdt19t0e000069pluhovz76n	cmdt19t11000769pl156tg70h	Milk	1	liter	dairy	2025-02-05 00:00:00	2025-08-01 16:23:56.742	2025-08-01 16:23:56.742
cmdt19t1r001q69plly3554r8	cmdt19t0m000269plq196s25s	cmdt19t13000d69plwnsjo1yc	Soy Sauce	1	bottle	condiments	2026-06-01 00:00:00	2025-08-01 16:23:56.752	2025-08-01 16:23:56.752
cmdt19t1r001r69plwe6lixmj	cmdt19t0m000269plq196s25s	cmdt19t13000c69pltq33r86z	Chicken Breast	1	lb	meat	2025-02-03 00:00:00	2025-08-01 16:23:56.752	2025-08-01 16:23:56.752
cmdt19t1r001s69plqhquixyf	cmdt19t0m000269plq196s25s	cmdt19t13000c69pltq33r86z	Bell Peppers	3	pieces	vegetables	2025-02-08 00:00:00	2025-08-01 16:23:56.752	2025-08-01 16:23:56.752
17540707180769x956s23v	JP91MWFXuKUQCBV9NdK1FVN5cR32	refrigerator	Butter	1	stick	dairy	2025-08-31 17:51:58.076	2025-08-01 17:51:58.076	2025-08-01 18:21:13.673
1754070717538490kvjnsg	JP91MWFXuKUQCBV9NdK1FVN5cR32	refrigerator	Greek Yogurt	1	container	dairy	2025-08-08 17:51:57.538	2025-08-01 17:51:57.538	2025-08-01 18:21:13.674
1754070716943zl50lhbqy	JP91MWFXuKUQCBV9NdK1FVN5cR32	refrigerator	Salmon Fillets	1	lb	meat	2025-08-03 17:51:56.943	2025-08-01 17:51:56.942	2025-08-01 18:21:13.675
1754070716147a3g3j16ov	JP91MWFXuKUQCBV9NdK1FVN5cR32	refrigerator	Bananas	6	pieces	vegetables	2025-08-08 17:51:56.147	2025-08-01 17:51:56.147	2025-08-01 18:21:13.676
17540707154273oqkewh7k	JP91MWFXuKUQCBV9NdK1FVN5cR32	refrigerator	Lemons	3	pieces	vegetables	2025-08-22 17:51:55.427	2025-08-01 17:51:55.427	2025-08-01 18:21:13.677
pantry-6	JP91MWFXuKUQCBV9NdK1FVN5cR32	refrigerator	Spinach	5	oz	vegetables	2025-08-06 17:49:34.898	2025-08-01 17:49:34.898	2025-08-01 18:21:13.677
pantry-8	JP91MWFXuKUQCBV9NdK1FVN5cR32	refrigerator	Chicken Breast	2	lb	meat	2025-08-05 17:49:34.898	2025-08-01 17:49:34.898	2025-08-01 18:21:13.679
pantry-3	JP91MWFXuKUQCBV9NdK1FVN5cR32	refrigerator	Cheddar Cheese	8	oz	dairy	2025-08-22 17:49:34.898	2025-07-31 17:49:34.898	2025-08-01 18:21:13.679
pantry-5	JP91MWFXuKUQCBV9NdK1FVN5cR32	refrigerator	Bell Peppers	3	pieces	vegetables	2025-08-08 17:49:34.898	2025-07-31 17:49:34.898	2025-08-01 18:21:13.681
pantry-7	JP91MWFXuKUQCBV9NdK1FVN5cR32	refrigerator	Ground Beef	1	lb	meat	2025-08-04 17:49:34.898	2025-07-31 17:49:34.898	2025-08-01 18:21:13.681
pantry-4	JP91MWFXuKUQCBV9NdK1FVN5cR32	refrigerator	Carrots	2	lb	vegetables	2025-08-11 17:49:34.898	2025-07-30 17:49:34.898	2025-08-01 18:21:13.682
pantry-1	JP91MWFXuKUQCBV9NdK1FVN5cR32	refrigerator	Milk	1	gallon	dairy	2025-08-06 17:49:34.898	2025-07-30 17:49:34.898	2025-08-01 18:21:13.682
pantry-2	JP91MWFXuKUQCBV9NdK1FVN5cR32	refrigerator	Eggs	12	pieces	dairy	2025-08-15 17:49:34.898	2025-07-29 17:49:34.898	2025-08-01 18:21:13.682
17540707188004cd4z2n7w	JP91MWFXuKUQCBV9NdK1FVN5cR32	pantry	Bread	1	loaf	grains	2025-08-04 17:51:58.8	2025-08-01 17:51:58.8	2025-08-01 18:21:13.683
pantry-18	JP91MWFXuKUQCBV9NdK1FVN5cR32	pantry	Potatoes	5	lb	vegetables	2025-08-31 17:49:34.898	2025-07-31 17:49:34.898	2025-08-01 18:21:13.684
pantry-12	JP91MWFXuKUQCBV9NdK1FVN5cR32	pantry	Diced Tomatoes	3	cans	canned	2027-08-01 17:49:34.898	2025-07-31 17:49:34.898	2025-08-01 18:21:13.684
pantry-11	JP91MWFXuKUQCBV9NdK1FVN5cR32	pantry	Black Beans	2	cans	legumes	2027-08-01 17:49:34.898	2025-07-30 17:49:34.898	2025-08-01 18:21:13.684
pantry-17	JP91MWFXuKUQCBV9NdK1FVN5cR32	pantry	Onions	3	pieces	vegetables	2025-07-27 04:00:00	2025-07-30 17:49:34.898	2025-08-01 18:21:13.685
pantry-10	JP91MWFXuKUQCBV9NdK1FVN5cR32	pantry	Pasta	1	lb	grains	2027-08-01 17:49:34.898	2025-07-29 17:49:34.898	2025-08-01 18:21:13.686
pantry-16	JP91MWFXuKUQCBV9NdK1FVN5cR32	pantry	Garlic	1	bulb	aromatics	2025-10-30 17:49:34.898	2025-07-29 17:49:34.898	2025-08-01 18:21:13.686
pantry-14	JP91MWFXuKUQCBV9NdK1FVN5cR32	pantry	Salt	1	container	spices	2030-07-31 17:49:34.898	2025-07-25 17:49:34.898	2025-08-01 18:21:13.687
pantry-15	JP91MWFXuKUQCBV9NdK1FVN5cR32	pantry	Black Pepper	1	container	spices	2028-07-31 17:49:34.898	2025-07-25 17:49:34.898	2025-08-01 18:21:13.687
pantry-9	JP91MWFXuKUQCBV9NdK1FVN5cR32	pantry	Rice	2	lb	grains	2026-08-01 17:49:34.898	2025-07-25 17:49:34.898	2025-08-01 18:21:13.687
pantry-13	JP91MWFXuKUQCBV9NdK1FVN5cR32	pantry	Olive Oil	500	ml	oils	2027-08-01 17:49:34.898	2025-07-25 17:49:34.898	2025-08-01 18:21:13.688
pantry-20	JP91MWFXuKUQCBV9NdK1FVN5cR32	freezer	Ice Cream	1	container	desserts	2026-01-28 18:49:34.898	2025-07-29 17:49:34.898	2025-08-01 18:21:13.689
pantry-19	JP91MWFXuKUQCBV9NdK1FVN5cR32	freezer	Frozen Peas	1	bag	vegetables	2026-08-01 17:49:34.898	2025-07-25 17:49:34.898	2025-08-01 18:21:13.689
\.


--
-- TOC entry 3547 (class 0 OID 16513)
-- Dependencies: 221
-- Data for Name: pantry_locations; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.pantry_locations (id, "userId", name, "order", "createdAt", "updatedAt") FROM stdin;
cmdt19t0p000569pljj5hzs9q	cmdt19t0e000069pluhovz76n	Pantry	2	2025-08-01 16:23:56.713	2025-08-01 16:23:56.713
cmdt19t11000769pl156tg70h	cmdt19t0e000069pluhovz76n	Refrigerator	1	2025-08-01 16:23:56.713	2025-08-01 16:23:56.713
cmdt19t11000969pl7toad97q	cmdt19t0e000069pluhovz76n	Freezer	3	2025-08-01 16:23:56.713	2025-08-01 16:23:56.713
cmdt19t13000c69pltq33r86z	cmdt19t0m000269plq196s25s	Fridge	1	2025-08-01 16:23:56.728	2025-08-01 16:23:56.728
cmdt19t13000d69plwnsjo1yc	cmdt19t0m000269plq196s25s	Cupboard	2	2025-08-01 16:23:56.728	2025-08-01 16:23:56.728
refrigerator	JP91MWFXuKUQCBV9NdK1FVN5cR32	xabcdef	0	2025-08-01 18:21:13.672	2025-08-01 18:21:13.672
pantry	JP91MWFXuKUQCBV9NdK1FVN5cR32	Pantry	1	2025-08-01 18:21:13.683	2025-08-01 18:21:13.683
freezer	JP91MWFXuKUQCBV9NdK1FVN5cR32	Freezer	2	2025-08-01 18:21:13.688	2025-08-01 18:21:13.688
\.


--
-- TOC entry 3543 (class 0 OID 16480)
-- Dependencies: 217
-- Data for Name: recipes; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.recipes (id, name, description, "prepTime", "cookTime", "totalTime", servings, difficulty, "imageUrl", "sourceUrl", "createdBy", "isPublic", "createdAt", "updatedAt") FROM stdin;
cmdt19t15000e69plc0b1m3m5	Classic Spaghetti Carbonara	Creamy Italian pasta dish with eggs, cheese, and pancetta	15	20	35	4	Medium	https://images.unsplash.com/photo-1621996346565-e3dbc353d2e5?w=400	\N	cmdt19t0e000069pluhovz76n	t	2025-08-01 16:23:56.729	2025-08-01 16:23:56.729
cmdt19t1a000r69plga5g8hps	Chicken Stir Fry	Quick and healthy stir fry with fresh vegetables	10	15	25	3	Easy	https://images.unsplash.com/photo-1603133872878-684f208fb84b?w=400	\N	cmdt19t0m000269plq196s25s	t	2025-08-01 16:23:56.734	2025-08-01 16:23:56.734
cmdt418qx0001bf2nv19v2gea	Test Recipe	A test recipe	10	20	30	4	\N	\N	\N	test123	t	2025-08-01 17:41:16.041	2025-08-01 17:41:16.041
\.


--
-- TOC entry 3542 (class 0 OID 16468)
-- Dependencies: 216
-- Data for Name: user_preferences; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.user_preferences (id, "userId", "unitSystem", "themeMode", language, timezone, "createdAt", "updatedAt") FROM stdin;
cmdt19t0e000169plqpib46xz	cmdt19t0e000069pluhovz76n	metric	light	en	America/New_York	2025-08-01 16:23:56.702	2025-08-01 16:23:56.702
cmdt19t0m000369plsn5zo1c0	cmdt19t0m000269plq196s25s	imperial	dark	en	America/Los_Angeles	2025-08-01 16:23:56.71	2025-08-01 16:23:56.71
cmdt41b470007bf2n29pt9mjs	test123	metric	dark	en	UTC	2025-08-01 17:41:19.112	2025-08-01 17:41:19.112
cmdt4br7800019k5merui1y35	JP91MWFXuKUQCBV9NdK1FVN5cR32	metric	automatic	en	UTC	2025-08-01 17:49:26.517	2025-08-01 18:21:05.21
\.


--
-- TOC entry 3544 (class 0 OID 16489)
-- Dependencies: 218
-- Data for Name: user_recipes; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.user_recipes (id, "userId", "recipeId", "customServings", "customNotes", "isFavorite", "timesCooked", "lastCookedAt", "addedAt", "updatedAt") FROM stdin;
cmdt19t1d001869pln5liioz1	cmdt19t0e000069pluhovz76n	cmdt19t15000e69plc0b1m3m5	6	Add extra parmesan - family loves it cheesy!	t	5	2025-01-25 00:00:00	2025-08-01 16:23:56.737	2025-08-01 16:23:56.737
cmdt19t1e001a69pluvrnbxwb	cmdt19t0e000069pluhovz76n	cmdt19t1a000r69plga5g8hps	4	\N	f	2	2025-01-20 00:00:00	2025-08-01 16:23:56.739	2025-08-01 16:23:56.739
cmdt19t1g001c69pl0l1g66gw	cmdt19t0m000269plq196s25s	cmdt19t15000e69plc0b1m3m5	2	Use turkey bacon instead of pancetta for healthier option	t	3	2025-01-28 00:00:00	2025-08-01 16:23:56.74	2025-08-01 16:23:56.74
cmdt19t1h001e69pl7jt3s4z6	cmdt19t0m000269plq196s25s	cmdt19t1a000r69plga5g8hps	3	\N	t	8	2025-01-30 00:00:00	2025-08-01 16:23:56.741	2025-08-01 16:23:56.741
cmdt418r30005bf2nv4w6qzi4	test123	cmdt418qx0001bf2nv19v2gea	\N	\N	f	0	\N	2025-08-01 17:41:16.048	2025-08-01 17:41:16.048
\.


--
-- TOC entry 3552 (class 0 OID 16557)
-- Dependencies: 226
-- Data for Name: user_stores; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.user_stores (id, "userId", name, "storeType", website, "logoUrl", "isEnabled", "deliveryTime", "minOrder", "deliveryFee", "order", "createdAt", "updatedAt") FROM stdin;
cmdt19t1v002469plz37xwuds	cmdt19t0e000069pluhovz76n	Amazon Fresh	delivery	https://www.amazon.com/fresh	\N	t	2-4 hours	$35	Free with Prime	1	2025-08-01 16:23:56.755	2025-08-01 16:23:56.755
cmdt19t1v002569plqnbrqu7a	cmdt19t0m000269plq196s25s	Instacart	delivery	https://www.instacart.com	\N	t	1-3 hours	$10	$3.99	1	2025-08-01 16:23:56.755	2025-08-01 16:23:56.755
cmdt19t1v002669pl0qsbn3dk	cmdt19t0e000069pluhovz76n	Whole Foods	pickup	https://www.wholefoodsmarket.com	\N	t	1 hour	$0	$0	2	2025-08-01 16:23:56.755	2025-08-01 16:23:56.755
\.


--
-- TOC entry 3541 (class 0 OID 16460)
-- Dependencies: 215
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.users (id, email, name, avatar, "createdAt", "updatedAt") FROM stdin;
cmdt19t0e000069pluhovz76n	alice@example.com	Alice Johnson	\N	2025-08-01 16:23:56.702	2025-08-01 16:23:56.702
cmdt19t0m000269plq196s25s	bob@example.com	Bob Smith	\N	2025-08-01 16:23:56.71	2025-08-01 16:23:56.71
test123	test@example.com	Test User	\N	2025-08-01 17:41:12.263	2025-08-01 17:41:12.263
JP91MWFXuKUQCBV9NdK1FVN5cR32	bobkuehne@gmail.com	Bob Kuehne	https://lh3.googleusercontent.com/a/ACg8ocKOqIyMWizlDH1ujdV0QX2xJhKXl4rMsURKyUyJfZGVyRjwrFwKXQ=s96-c	2025-08-01 17:49:26.454	2025-08-01 18:21:04.147
\.


--
-- TOC entry 3333 (class 2606 OID 16457)
-- Name: _prisma_migrations _prisma_migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public._prisma_migrations
    ADD CONSTRAINT _prisma_migrations_pkey PRIMARY KEY (id);


--
-- TOC entry 3374 (class 2606 OID 16548)
-- Name: depleted_items depleted_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.depleted_items
    ADD CONSTRAINT depleted_items_pkey PRIMARY KEY (id);


--
-- TOC entry 3370 (class 2606 OID 16538)
-- Name: grocery_items grocery_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.grocery_items
    ADD CONSTRAINT grocery_items_pkey PRIMARY KEY (id);


--
-- TOC entry 3355 (class 2606 OID 16505)
-- Name: ingredients ingredients_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ingredients
    ADD CONSTRAINT ingredients_pkey PRIMARY KEY (id);


--
-- TOC entry 3358 (class 2606 OID 16512)
-- Name: instructions instructions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.instructions
    ADD CONSTRAINT instructions_pkey PRIMARY KEY (id);


--
-- TOC entry 3378 (class 2606 OID 16556)
-- Name: meal_plans meal_plans_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.meal_plans
    ADD CONSTRAINT meal_plans_pkey PRIMARY KEY (id);


--
-- TOC entry 3365 (class 2606 OID 16529)
-- Name: pantry_items pantry_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pantry_items
    ADD CONSTRAINT pantry_items_pkey PRIMARY KEY (id);


--
-- TOC entry 3361 (class 2606 OID 16521)
-- Name: pantry_locations pantry_locations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pantry_locations
    ADD CONSTRAINT pantry_locations_pkey PRIMARY KEY (id);


--
-- TOC entry 3345 (class 2606 OID 16488)
-- Name: recipes recipes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.recipes
    ADD CONSTRAINT recipes_pkey PRIMARY KEY (id);


--
-- TOC entry 3339 (class 2606 OID 16479)
-- Name: user_preferences user_preferences_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_preferences
    ADD CONSTRAINT user_preferences_pkey PRIMARY KEY (id);


--
-- TOC entry 3348 (class 2606 OID 16498)
-- Name: user_recipes user_recipes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_recipes
    ADD CONSTRAINT user_recipes_pkey PRIMARY KEY (id);


--
-- TOC entry 3382 (class 2606 OID 16566)
-- Name: user_stores user_stores_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_stores
    ADD CONSTRAINT user_stores_pkey PRIMARY KEY (id);


--
-- TOC entry 3337 (class 2606 OID 16467)
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- TOC entry 3375 (class 1259 OID 16588)
-- Name: depleted_items_userId_depletedDate_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "depleted_items_userId_depletedDate_idx" ON public.depleted_items USING btree ("userId", "depletedDate" DESC);


--
-- TOC entry 3376 (class 1259 OID 16589)
-- Name: depleted_items_userId_timesUsed_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "depleted_items_userId_timesUsed_idx" ON public.depleted_items USING btree ("userId", "timesUsed" DESC);


--
-- TOC entry 3371 (class 1259 OID 16587)
-- Name: grocery_items_userId_addedDate_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "grocery_items_userId_addedDate_idx" ON public.grocery_items USING btree ("userId", "addedDate" DESC);


--
-- TOC entry 3372 (class 1259 OID 16586)
-- Name: grocery_items_userId_completed_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "grocery_items_userId_completed_idx" ON public.grocery_items USING btree ("userId", completed);


--
-- TOC entry 3353 (class 1259 OID 16579)
-- Name: ingredients_name_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ingredients_name_idx ON public.ingredients USING btree (name);


--
-- TOC entry 3356 (class 1259 OID 16578)
-- Name: ingredients_recipeId_order_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "ingredients_recipeId_order_idx" ON public.ingredients USING btree ("recipeId", "order");


--
-- TOC entry 3359 (class 1259 OID 16580)
-- Name: instructions_recipeId_order_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "instructions_recipeId_order_idx" ON public.instructions USING btree ("recipeId", "order");


--
-- TOC entry 3379 (class 1259 OID 16590)
-- Name: meal_plans_userId_date_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "meal_plans_userId_date_idx" ON public.meal_plans USING btree ("userId", date);


--
-- TOC entry 3380 (class 1259 OID 16591)
-- Name: meal_plans_userId_mealType_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "meal_plans_userId_mealType_idx" ON public.meal_plans USING btree ("userId", "mealType");


--
-- TOC entry 3363 (class 1259 OID 16585)
-- Name: pantry_items_name_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX pantry_items_name_idx ON public.pantry_items USING btree (name);


--
-- TOC entry 3366 (class 1259 OID 16584)
-- Name: pantry_items_userId_addedDate_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "pantry_items_userId_addedDate_idx" ON public.pantry_items USING btree ("userId", "addedDate" DESC);


--
-- TOC entry 3367 (class 1259 OID 16583)
-- Name: pantry_items_userId_expirationDate_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "pantry_items_userId_expirationDate_idx" ON public.pantry_items USING btree ("userId", "expirationDate");


--
-- TOC entry 3368 (class 1259 OID 16582)
-- Name: pantry_items_userId_locationId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "pantry_items_userId_locationId_idx" ON public.pantry_items USING btree ("userId", "locationId");


--
-- TOC entry 3362 (class 1259 OID 16581)
-- Name: pantry_locations_userId_order_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "pantry_locations_userId_order_idx" ON public.pantry_locations USING btree ("userId", "order");


--
-- TOC entry 3341 (class 1259 OID 16572)
-- Name: recipes_createdBy_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "recipes_createdBy_idx" ON public.recipes USING btree ("createdBy");


--
-- TOC entry 3342 (class 1259 OID 16573)
-- Name: recipes_isPublic_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "recipes_isPublic_idx" ON public.recipes USING btree ("isPublic");


--
-- TOC entry 3343 (class 1259 OID 16570)
-- Name: recipes_name_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX recipes_name_idx ON public.recipes USING btree (name);


--
-- TOC entry 3346 (class 1259 OID 16571)
-- Name: recipes_totalTime_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "recipes_totalTime_idx" ON public.recipes USING btree ("totalTime");


--
-- TOC entry 3340 (class 1259 OID 16569)
-- Name: user_preferences_userId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "user_preferences_userId_key" ON public.user_preferences USING btree ("userId");


--
-- TOC entry 3349 (class 1259 OID 16574)
-- Name: user_recipes_userId_addedAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "user_recipes_userId_addedAt_idx" ON public.user_recipes USING btree ("userId", "addedAt" DESC);


--
-- TOC entry 3350 (class 1259 OID 16575)
-- Name: user_recipes_userId_isFavorite_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "user_recipes_userId_isFavorite_idx" ON public.user_recipes USING btree ("userId", "isFavorite");


--
-- TOC entry 3351 (class 1259 OID 16577)
-- Name: user_recipes_userId_recipeId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "user_recipes_userId_recipeId_key" ON public.user_recipes USING btree ("userId", "recipeId");


--
-- TOC entry 3352 (class 1259 OID 16576)
-- Name: user_recipes_userId_timesCooked_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "user_recipes_userId_timesCooked_idx" ON public.user_recipes USING btree ("userId", "timesCooked" DESC);


--
-- TOC entry 3383 (class 1259 OID 16592)
-- Name: user_stores_userId_isEnabled_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "user_stores_userId_isEnabled_idx" ON public.user_stores USING btree ("userId", "isEnabled");


--
-- TOC entry 3384 (class 1259 OID 16593)
-- Name: user_stores_userId_order_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "user_stores_userId_order_idx" ON public.user_stores USING btree ("userId", "order");


--
-- TOC entry 3334 (class 1259 OID 16568)
-- Name: users_email_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX users_email_idx ON public.users USING btree (email);


--
-- TOC entry 3335 (class 1259 OID 16567)
-- Name: users_email_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX users_email_key ON public.users USING btree (email);


--
-- TOC entry 3394 (class 2606 OID 16639)
-- Name: depleted_items depleted_items_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.depleted_items
    ADD CONSTRAINT "depleted_items_userId_fkey" FOREIGN KEY ("userId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 3393 (class 2606 OID 16634)
-- Name: grocery_items grocery_items_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.grocery_items
    ADD CONSTRAINT "grocery_items_userId_fkey" FOREIGN KEY ("userId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 3388 (class 2606 OID 16609)
-- Name: ingredients ingredients_recipeId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ingredients
    ADD CONSTRAINT "ingredients_recipeId_fkey" FOREIGN KEY ("recipeId") REFERENCES public.recipes(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 3389 (class 2606 OID 16614)
-- Name: instructions instructions_recipeId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.instructions
    ADD CONSTRAINT "instructions_recipeId_fkey" FOREIGN KEY ("recipeId") REFERENCES public.recipes(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 3395 (class 2606 OID 16649)
-- Name: meal_plans meal_plans_recipeId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.meal_plans
    ADD CONSTRAINT "meal_plans_recipeId_fkey" FOREIGN KEY ("recipeId") REFERENCES public.recipes(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 3396 (class 2606 OID 16644)
-- Name: meal_plans meal_plans_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.meal_plans
    ADD CONSTRAINT "meal_plans_userId_fkey" FOREIGN KEY ("userId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 3391 (class 2606 OID 16629)
-- Name: pantry_items pantry_items_locationId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pantry_items
    ADD CONSTRAINT "pantry_items_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES public.pantry_locations(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 3392 (class 2606 OID 16624)
-- Name: pantry_items pantry_items_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pantry_items
    ADD CONSTRAINT "pantry_items_userId_fkey" FOREIGN KEY ("userId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 3390 (class 2606 OID 16619)
-- Name: pantry_locations pantry_locations_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pantry_locations
    ADD CONSTRAINT "pantry_locations_userId_fkey" FOREIGN KEY ("userId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 3385 (class 2606 OID 16594)
-- Name: user_preferences user_preferences_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_preferences
    ADD CONSTRAINT "user_preferences_userId_fkey" FOREIGN KEY ("userId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 3386 (class 2606 OID 16604)
-- Name: user_recipes user_recipes_recipeId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_recipes
    ADD CONSTRAINT "user_recipes_recipeId_fkey" FOREIGN KEY ("recipeId") REFERENCES public.recipes(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 3387 (class 2606 OID 16599)
-- Name: user_recipes user_recipes_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_recipes
    ADD CONSTRAINT "user_recipes_userId_fkey" FOREIGN KEY ("userId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 3397 (class 2606 OID 16654)
-- Name: user_stores user_stores_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_stores
    ADD CONSTRAINT "user_stores_userId_fkey" FOREIGN KEY ("userId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


-- Completed on 2025-08-01 18:28:25 UTC

--
-- PostgreSQL database dump complete
--

