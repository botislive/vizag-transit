# APSRTC Route Catalogue Audit Report — Visakhapatnam Region

## 1. Executive Summary

- **GTFS Source**: `reclaimchennai/India_GTFS` (`andhra-pradesh/apsrtc.zip`)
- **Total APSRTC Routes in Feed**: 5,095
- **Total APSRTC Stops in Feed**: 11,156
- **Total Trips in Feed**: 54,812
- **Vizag City Routes**: 282 routes
- **Vizag Regional Feeder Routes**: 118 routes
- **Intercity Corridors Serving Vizag**: 141 routes
- **Other Statewide APSRTC Routes**: 4550 routes

### Route Grouping & Identifier Strategy
- **Verified Vizag Network (City + Regional)**: **400** individual `route_id`s representing **270** distinct passenger-facing route numbers (`route_short_name`).
- **Directions & Variants**: In APSRTC GTFS, reverse directions and branch termini are published under separate `route_id`s while sharing the same alphanumeric passenger route number (e.g., `28K`, `TV03`, `BO47`). The catalogue groups these under the master passenger route number while preserving the distinct `route_id`s, stop sequences, and `trip_id`s internally.
- **Vehicle Registration Numbers**: The GTFS-RT feed provides `vehicle.label` and `vehicle.license_plate` (e.g. `AP31Z0344`, `AP39Z0794`). Only actual registration plates from the feed are displayed; if missing, neutral identifiers (`Bus #ID`) are used.

## 2. Audit Table: Visakhapatnam City Routes

| Route No | Route ID | Origin | Destination | Trips | Stops | Geometry | Classification | Conf. | Classification Reason |
|---|---|---|---|---|---|---|---|---|---|
| **9047** | `9047-gurudwara-jn-visakhapatnam-asr-international-airport` | Visakhapatnam Asr International Airport | Gurudwara Jn | 13 | 7 | Yes | Vizag City | Medium | 7/7 stops (100%) within Vizag metro corridor |
| **9047** | `9047-kancharapalem-visakhapatnam-asr-international-airport` | Visakhapatnam Asr International Airport | Kancharapalem | 12 | 9 | Yes | Vizag City | Medium | 9/9 stops (100%) within Vizag metro corridor |
| **9092** | `9092-rtc-complex-vsp-waltair-depot` | Waltair Depot | Rtc Complex Vsp | 95 | 4 | Yes | Vizag City | High | 4/4 stops (100%) within Vizag metro corridor |
| **9092** | `9092-madugula-rtc-complex-vsp` | Rtc Complex Vsp | Madugula | 30 | 28 | Yes | Vizag City | High | 24/28 stops (86%) within Vizag metro corridor |
| **9191** | `9191-anakapalli-vizianagaram` | Vizianagaram | Anakapalli | 68 | 18 | Yes | Vizag City | Medium | 15/18 stops (83%) within Vizag metro corridor |
| **9316** | `9316-simhachalam-simhachalam-depot` | Simhachalam | Simhachalam Depot | 106 | 3 | Yes | Vizag City | High | 3/3 stops (100%) within Vizag metro corridor |
| **9541** | `9541-simhachalam-hill-vizianagaram` | Vizianagaram | Simhachalam Hill | 22 | 16 | Yes | Vizag City | High | 13/16 stops (81%) within Vizag metro corridor |
| **9541** | `9541-simhachalam-depot-vizianagaram` | Simhachalam Depot | Vizianagaram | 2 | 16 | Yes | Vizag City | High | 13/16 stops (81%) within Vizag metro corridor |
| **A009** | `a009-maddilapalem-rtc-complex-vsp` | Maddilapalem | Rtc Complex Vsp | 46 | 2 | Yes | Vizag City | High | 2/2 stops (100%) within Vizag metro corridor |
| **A011** | `a011-old-head-post-office-ravindranagar` | Ravindranagar | Old Head Post Office | 163 | 7 | Yes | Vizag City | High | 7/7 stops (100%) within Vizag metro corridor |
| **A011** | `a011-ravindranagar-waltair-depot` | Waltair Depot | Ravindranagar | 18 | 4 | Yes | Vizag City | High | 4/4 stops (100%) within Vizag metro corridor |
| **A016** | `a016-rtc-complex-vsp-vepada` | Rtc Complex Vsp | Vepada | 2 | 28 | Yes | Vizag City | High | 28/28 stops (100%) within Vizag metro corridor |
| **A022** | `a022-hill-no-2-rtc-complex-vsp` | Rtc Complex Vsp | Hill No 2 | 5 | 11 | Yes | Vizag City | High | 11/11 stops (100%) within Vizag metro corridor |
| **A022** | `a022-hill-no-2-r-k-beach` | Hill No 2 | R.K.Beach | 3 | 18 | Yes | Vizag City | High | 18/18 stops (100%) within Vizag metro corridor |
| **A022** | `a022-maddilapalem-r-k-beach` | R.K.Beach | Maddilapalem | 1 | 5 | Yes | Vizag City | High | 5/5 stops (100%) within Vizag metro corridor |
| **A024** | `a024-gollala-endada-town-kotharoad` | Gollala Endada | Town Kotharoad | 27 | 9 | Yes | Vizag City | High | 9/9 stops (100%) within Vizag metro corridor |
| **A024** | `a024-old-head-post-office-sagarnagar` | Old Head Post Office | Sagarnagar | 1 | 8 | Yes | Vizag City | High | 8/8 stops (100%) within Vizag metro corridor |
| **A024** | `a024-maddilapalem-sagarnagar` | Sagarnagar | Maddilapalem | 1 | 4 | Yes | Vizag City | High | 4/4 stops (100%) within Vizag metro corridor |
| **A033** | `a033-bheemunipatnam-railway-station-vsp` | Railway Station-Vsp | Bheemunipatnam | 74 | 18 | Yes | Vizag City | High | 17/18 stops (94%) within Vizag metro corridor |
| **A033** | `a033-railway-station-vsp-waltair-depot` | Railway Station Vsp | Waltair Depot | 16 | 5 | Yes | Vizag City | High | 5/5 stops (100%) within Vizag metro corridor |
| **A091** | `a091-collector-office-devarapalle` | Collector Office | Devarapalle | 6 | 35 | Yes | Vizag City | High | 35/35 stops (100%) within Vizag metro corridor |
| **A091** | `a091-k-kotapadu-vsp-waltair-depot` | Waltair Depot | K Kotapadu-Vsp | 3 | 31 | Yes | Vizag City | High | 31/31 stops (100%) within Vizag metro corridor |
| **A091** | `a091-collector-office-k-kotapadu-vsp` | K Kotapadu-Vsp | Collector Office | 2 | 26 | Yes | Vizag City | High | 26/26 stops (100%) within Vizag metro corridor |
| **A091** | `a091-devarapalle-waltair-depot` | Devarapalle | Waltair Depot | 2 | 38 | Yes | Vizag City | High | 38/38 stops (100%) within Vizag metro corridor |
| **A221** | `a221-arilova-colony-old-head-post-office` | Old Head Post Office | Arilova Colony | 1 | 8 | Yes | Vizag City | Medium | 8/8 stops (100%) within Vizag metro corridor |
| **A231** | `a231-arilova-colony-waltair-depot` | Waltair Depot | Arilova Colony | 2 | 5 | Yes | Vizag City | High | 5/5 stops (100%) within Vizag metro corridor |
| **A232** | `a232-arilova-colony-old-head-post-office` | Arilova Colony | Old Head Post Office | 128 | 8 | Yes | Vizag City | High | 8/8 stops (100%) within Vizag metro corridor |
| **AB01** | `ab01-amaravathi-colony-railway-station-vsp` | Amaravathi Colony | Railway Station Vsp | 12 | 12 | Yes | Vizag City | High | 12/12 stops (100%) within Vizag metro corridor |
| **AB01** | `ab01-amaravathi-colony-madhurawada-depot` | Madhurawada Depot | Amaravathi Colony | 8 | 8 | Yes | Vizag City | High | 8/8 stops (100%) within Vizag metro corridor |
| **AKPL** | `akpl-anakapalli-devarapalle` | Anakapalli | Devarapalle | 36 | 11 | Yes | Vizag City | Medium | 11/11 stops (100%) within Vizag metro corridor |
| **AM10** | `am10-old-gajuwaka-visakhapatnam-asr-international-airport` | Visakhapatnam Asr International Airport | Old Gajuwaka | 80 | 14 | Yes | Vizag City | Medium | 14/14 stops (100%) within Vizag metro corridor |
| **AO11** | `ao11-old-head-post-office-srama-shakti-nagar` | Old Head Post Office | Srama Shakti Nagar | 2 | 12 | Yes | Vizag City | High | 12/12 stops (100%) within Vizag metro corridor |
| **AO12** | `ao12-old-head-post-office-pendurthi` | Old Head Post Office | Pendurthi | 4 | 12 | Yes | Vizag City | High | 12/12 stops (100%) within Vizag metro corridor |
| **AO21** | `ao21-old-head-post-office-simhachalam` | Old Head Post Office | Simhachalam | 19 | 19 | Yes | Vizag City | High | 19/19 stops (100%) within Vizag metro corridor |
| **AO21** | `ao21-simhachalam-depot-sujathanagar-c2-zone` | Simhachalam Depot | Sujathanagar-C2 Zone | 1 | 5 | Yes | Vizag City | High | 5/5 stops (100%) within Vizag metro corridor |
| **AO21** | `ao21-old-head-post-office-sujathanagar-c2-zone` | Sujathanagar-C2 Zone | Old Head Post Office | 1 | 12 | Yes | Vizag City | High | 12/12 stops (100%) within Vizag metro corridor |
| **AO22** | `ao22-old-head-post-office-simhachalam-hill` | Old Head Post Office | Simhachalam Hill | 48 | 20 | Yes | Vizag City | High | 20/20 stops (100%) within Vizag metro corridor |
| **AO31** | `ao31-dabbanda-old-head-post-office` | Old Head Post Office | Dabbanda | 4 | 15 | Yes | Vizag City | High | 15/15 stops (100%) within Vizag metro corridor |
| **AO41** | `ao41-old-head-post-office-vuda-colony` | Old Head Post Office | Vuda Colony | 2 | 12 | Yes | Vizag City | High | 12/12 stops (100%) within Vizag metro corridor |
| **AO81** | `ao81-nadupuru-part-rtc-complex-vsp` | Nadupuru (Part) | Rtc Complex Vsp | 30 | 14 | Yes | Vizag City | High | 14/14 stops (100%) within Vizag metro corridor |
| **AO81** | `ao81-gwk-depot-nadupuru-part` | Gwk Depot | Nadupuru (Part) | 6 | 4 | Yes | Vizag City | High | 4/4 stops (100%) within Vizag metro corridor |
| **AP19** | `ap19-kurmannapalem-new-gajuwaka` | Kurmannapalem | New Gajuwaka | 29 | 5 | Yes | Vizag City | High | 5/5 stops (100%) within Vizag metro corridor |
| **AP19** | `ap19-anakapalli-new-gajuwaka` | New Gajuwaka | Anakapalli | 29 | 14 | Yes | Vizag City | High | 14/14 stops (100%) within Vizag metro corridor |
| **AP19** | `ap19-anakapalli-cokeovens` | Cokeovens | Anakapalli | 4 | 24 | Yes | Vizag City | High | 24/24 stops (100%) within Vizag metro corridor |
| **AR03** | `ar03-arilova-colony-rtc-complex-vsp` | Arilova Colony | Rtc Complex Vsp | 6 | 7 | Yes | Vizag City | High | 7/7 stops (100%) within Vizag metro corridor |
| **AR03** | `ar03-arilova-colony-maddilapalem` | Maddilapalem | Arilova Colony | 3 | 4 | Yes | Vizag City | High | 4/4 stops (100%) within Vizag metro corridor |
| **AR04** | `ar04-arilova-colony-railway-station-vsp` | Arilova Colony | Railway Station Vsp | 51 | 8 | Yes | Vizag City | High | 8/8 stops (100%) within Vizag metro corridor |
| **AS02** | `as02-anakapalli-scindia` | Anakapalli | Scindia | 72 | 17 | Yes | Vizag City | High | 17/17 stops (100%) within Vizag metro corridor |
| **AS02** | `as02-anakapalli-old-gajuwaka` | Anakapalli | Old Gajuwaka | 4 | 13 | Yes | Vizag City | High | 13/13 stops (100%) within Vizag metro corridor |
| **B011** | `b011-rtc-complex-vsp-simhachalam` | Simhachalam | Rtc Complex Vsp | 232 | 10 | Yes | Vizag City | High | 10/10 stops (100%) within Vizag metro corridor |
| **B011** | `b011-neella-kundeelu-simhachalam` | Simhachalam | Neella Kundeelu | 2 | 8 | Yes | Vizag City | High | 8/8 stops (100%) within Vizag metro corridor |
| **B062** | `b062-bheemunipatnam-oldbusstand-vsp` | Bheemunipatnam | Oldbusstand-Vsp | 2 | 19 | Yes | Vizag City | High | 18/19 stops (95%) within Vizag metro corridor |
| **BB07** | `bb07-msme-pudimadaka-simhachalam` | Simhachalam | Msme-Pudimadaka | 2 | 29 | Yes | Vizag City | High | 28/29 stops (97%) within Vizag metro corridor |
| **BB07** | `bb07-msme-pudimadaka-simhachalam-hill` | Msme-Pudimadaka | Simhachalam Hill | 2 | 30 | Yes | Vizag City | High | 29/30 stops (97%) within Vizag metro corridor |
| **BK03** | `bk03-amaravathi-colony-town-koth-raod` | Amaravathi Colony | Town Koth Raod | 12 | 14 | Yes | Vizag City | High | 14/14 stops (100%) within Vizag metro corridor |
| **BM02** | `bm02-anakapalli-tagarapu-valasa-citybus-stop` | Tagarapu Valasa Citybus Stop | Anakapalli | 14 | 29 | Yes | Vizag City | High | 29/29 stops (100%) within Vizag metro corridor |
| **BM02** | `bm02-rtc-complex-vsp-tagarapu-valasa-citybus-stop` | Tagarapu Valasa Citybus Stop | Rtc Complex Vsp | 4 | 17 | Yes | Vizag City | High | 17/17 stops (100%) within Vizag metro corridor |
| **BM06** | `bm06-maddilapalem-railway-station-vsp` | Maddilapalem | Railway Station Vsp | 25 | 3 | Yes | Vizag City | High | 3/3 stops (100%) within Vizag metro corridor |
| **BM06** | `bm06-kottavalasa-tagarapu-valasa-citybus-stop` | Tagarapu Valasa Citybus Stop | Kottavalasa | 2 | 21 | Yes | Vizag City | High | 21/21 stops (100%) within Vizag metro corridor |
| **BO02** | `bo02-gwk-depot-yaradabeach` | Gwk Depot | Yaradabeach | 6 | 10 | Yes | Vizag City | High | 10/10 stops (100%) within Vizag metro corridor |
| **BO11** | `bo11-gwk-depot-scindia` | Gwk Depot | Scindia | 41 | 4 | Yes | Vizag City | High | 4/4 stops (100%) within Vizag metro corridor |
| **BO14** | `bo14-kottavalasa-steel-maingate` | Kottavalasa | Steel Maingate | 4 | 22 | Yes | Vizag City | High | 22/22 stops (100%) within Vizag metro corridor |
| **BO22** | `bo22-sriharipuram-cg-vepada` | Sriharipuram-Cg | Vepada | 4 | 33 | Yes | Vizag City | High | 32/33 stops (97%) within Vizag metro corridor |
| **BO22** | `bo22-anandapuram-sriharipuram-cg` | Sriharipuram-Cg | Anandapuram | 2 | 28 | Yes | Vizag City | High | 28/28 stops (100%) within Vizag metro corridor |
| **BO23** | `bo23-pendurthi-tagarapuvalasa` | Tagarapuvalasa | Pendurthi | 30 | 16 | Yes | Vizag City | High | 16/16 stops (100%) within Vizag metro corridor |
| **BO42** | `bo42-k-kotapadu-vsp-scindia` | Scindia | K Kotapadu-Vsp | 4 | 26 | Yes | Vizag City | High | 26/26 stops (100%) within Vizag metro corridor |
| **BO42** | `bo42-devarapalle-k-kotapadu-vsp` | K Kotapadu-Vsp | Devarapalle | 1 | 10 | Yes | Vizag City | High | 10/10 stops (100%) within Vizag metro corridor |
| **BO43** | `bo43-devarapalle-scindia` | Devarapalle | Scindia | 5 | 35 | Yes | Vizag City | High | 35/35 stops (100%) within Vizag metro corridor |
| **BO44** | `bo44-k-kotapadu-vsp-sriharipuram-cg` | K Kotapadu-Vsp | Sriharipuram-Cg | 5 | 24 | Yes | Vizag City | High | 24/24 stops (100%) within Vizag metro corridor |
| **BO47** | `bo47-gwk-depot-tagarapuvalasa` | Gwk Depot | Tagarapuvalasa | 10 | 27 | Yes | Vizag City | High | 27/27 stops (100%) within Vizag metro corridor |
| **BO61** | `bo61-scindia-yaradabeach` | Scindia | Yaradabeach | 25 | 7 | Yes | Vizag City | High | 7/7 stops (100%) within Vizag metro corridor |
| **BO61** | `bo61-scindia-yarada-vilg` | Yarada Vilg | Scindia | 13 | 6 | Yes | Vizag City | High | 6/6 stops (100%) within Vizag metro corridor |
| **BO61** | `bo61-purnamarket-vsp-yaradabeach` | Yaradabeach | Purnamarket-Vsp | 2 | 16 | Yes | Vizag City | High | 16/16 stops (100%) within Vizag metro corridor |
| **BUS1** | `bus1-anakapalli-kondakarla` | Kondakarla | Anakapalli | 2 | 3 | Yes | Vizag City | Medium | 3/3 stops (100%) within Vizag metro corridor |
| **BUS1** | `bus1-kondakarla-model-school-t` | Kondakarla | Model School T | 2 | 9 | Yes | Vizag City | Medium | 9/9 stops (100%) within Vizag metro corridor |
| **BUS1** | `bus1-anakapalli-model-scool` | Model Scool | Anakapalli | 2 | 4 | Yes | Vizag City | Medium | 4/4 stops (100%) within Vizag metro corridor |
| **BUS2** | `bus2-anakapalli-tegada` | Tegada | Anakapalli | 4 | 5 | Yes | Vizag City | Medium | 4/5 stops (80%) within Vizag metro corridor |
| **BUS3** | `bus3-annavaram-chodavaram` | Chodavaram | Annavaram | 4 | 2 | Yes | Vizag City | Medium | 2/2 stops (100%) within Vizag metro corridor |
| **BUS3** | `bus3-chodavaram-mycherla-palem` | Chodavaram | Mycherla Palem | 2 | 5 | Yes | Vizag City | Medium | 4/5 stops (80%) within Vizag metro corridor |
| **BUS3** | `bus3-anakapalli-mycherla-palem` | Mycherla Palem | Anakapalli | 2 | 10 | Yes | Vizag City | Medium | 9/10 stops (90%) within Vizag metro corridor |
| **BUS8** | `bus8-anakapalli-santapalem` | Anakapalli | Santapalem | 2 | 4 | Yes | Vizag City | Medium | 4/4 stops (100%) within Vizag metro corridor |
| **BUS8** | `bus8-maturu-road-venkannapalem` | Maturu Road | Venkannapalem | 2 | 3 | Yes | Vizag City | Medium | 3/3 stops (100%) within Vizag metro corridor |
| **BUS8** | `bus8-anakapalli-venkannapalem` | Venkannapalem | Anakapalli | 2 | 4 | Yes | Vizag City | Medium | 4/4 stops (100%) within Vizag metro corridor |
| **CD01** | `cd01-kurmannapalem-old-gajuwaka` | Old Gajuwaka | Kurmannapalem | 5 | 4 | Yes | Vizag City | High | 4/4 stops (100%) within Vizag metro corridor |
| **CD01** | `cd01-kurmannapalem-scindia` | Kurmannapalem | Scindia | 4 | 7 | Yes | Vizag City | High | 7/7 stops (100%) within Vizag metro corridor |
| **CD01** | `cd01-chodavaram-old-gajuwaka` | Chodavaram | Old Gajuwaka | 4 | 24 | Yes | Vizag City | High | 24/24 stops (100%) within Vizag metro corridor |
| **CD02** | `cd02-chodavaram-scindia` | Scindia | Chodavaram | 44 | 32 | Yes | Vizag City | High | 32/32 stops (100%) within Vizag metro corridor |
| **CD03** | `cd03-chodavaram-sriharipuram-cg` | Chodavaram | Sriharipuram-Cg | 4 | 26 | Yes | Vizag City | High | 26/26 stops (100%) within Vizag metro corridor |
| **CD10** | `cd10-anakapalli-tantadi` | Tantadi | Anakapalli | 4 | 7 | Yes | Vizag City | Medium | 7/7 stops (100%) within Vizag metro corridor |
| **CD10** | `cd10-anakapalli-msme` | Anakapalli | Msme | 3 | 5 | Yes | Vizag City | Medium | 4/5 stops (80%) within Vizag metro corridor |
| **CD12** | `cd12-anakapalli-chodavaram` | Anakapalli | Chodavaram | 105 | 10 | Yes | Vizag City | Medium | 9/10 stops (90%) within Vizag metro corridor |
| **CD41** | `cd41-manchala-rtc-complex-vsp` | Rtc Complex Vsp | Manchala | 2 | 33 | Yes | Vizag City | High | 31/33 stops (94%) within Vizag metro corridor |
| **CDM3** | `cdm3-anakapalli-pudimadaka` | Anakapalli | Pudimadaka | 5 | 5 | Yes | Vizag City | Medium | 4/5 stops (80%) within Vizag metro corridor |
| **CH01** | `ch01-old-head-post-office-waltair-depot` | Waltair Depot | Old Head Post Office | 22 | 6 | Yes | Vizag City | High | 6/6 stops (100%) within Vizag metro corridor |
| **CH03** | `ch03-madhavadhara-vuda-colony-old-head-post-office` | Old Head Post Office | Madhavadhara Vuda Colony | 120 | 9 | Yes | Vizag City | High | 9/9 stops (100%) within Vizag metro corridor |
| **CH04** | `ch04-madhavadhara-vuda-colony-waltair-depot` | Madhavadhara Vuda Colony | Waltair Depot | 8 | 9 | Yes | Vizag City | High | 9/9 stops (100%) within Vizag metro corridor |
| **CH15** | `ch15-chodavaram-rtc-complex-vsp` | Rtc Complex Vsp | Chodavaram | 131 | 28 | Yes | Vizag City | High | 28/28 stops (100%) within Vizag metro corridor |
| **CH16** | `ch16-anakapalli-visakhapatnam` | Visakhapatnam | Anakapalli | 70 | 19 | Yes | Vizag City | High | 19/19 stops (100%) within Vizag metro corridor |
| **CH16** | `ch16-rtc-complex-vsp-sabbavaram` | Rtc Complex Vsp | Sabbavaram | 28 | 19 | Yes | Vizag City | High | 19/19 stops (100%) within Vizag metro corridor |
| **CH16** | `ch16-sabbavaram-simhachalam-depot` | Simhachalam Depot | Sabbavaram | 4 | 20 | Yes | Vizag City | High | 20/20 stops (100%) within Vizag metro corridor |
| **CHV5** | `chv5-rtc-complex-vsp-simhachalam` | Simhachalam | Rtc Complex Vsp | 1 | 10 | Yes | Vizag City | Medium | 10/10 stops (100%) within Vizag metro corridor |
| **CO71** | `co71-old-gajuwaka-rtc-complex-vsp` | Old Gajuwaka | Rtc Complex Vsp | 87 | 24 | Yes | Vizag City | High | 24/24 stops (100%) within Vizag metro corridor |
| **CO71** | `co71-old-gajuwaka-sriharipuram-cg` | Old Gajuwaka | Sriharipuram-Cg | 2 | 3 | Yes | Vizag City | High | 3/3 stops (100%) within Vizag metro corridor |
| **CO76** | `co76-sriharipuram-cg-yelamanchili` | Yelamanchili | Sriharipuram-Cg | 1 | 28 | Yes | Vizag City | High | 23/28 stops (82%) within Vizag metro corridor |
| **CO92** | `co92-gwk-depot-yelamanchili` | Gwk Depot | Yelamanchili | 7 | 28 | Yes | Vizag City | High | 23/28 stops (82%) within Vizag metro corridor |
| **DEV5** | `dev5-anakapalli-yadagiripalem` | Yadagiripalem | Anakapalli | 6 | 7 | Yes | Vizag City | Medium | 6/7 stops (86%) within Vizag metro corridor |
| **DO01** | `do01-duvvada-rtc-complex-vsp` | Duvvada | Rtc Complex Vsp | 23 | 26 | Yes | Vizag City | High | 26/26 stops (100%) within Vizag metro corridor |
| **DO01** | `do01-duvvada-gwk-depot` | Gwk Depot | Duvvada | 1 | 7 | Yes | Vizag City | High | 7/7 stops (100%) within Vizag metro corridor |
| **DO02** | `do02-gwk-depot-rtc-complex-vsp` | Rtc Complex Vsp | Gwk Depot | 24 | 13 | Yes | Vizag City | High | 13/13 stops (100%) within Vizag metro corridor |
| **DS03** | `ds03-kurmannapalem-rtc-complex-vsp` | Rtc Complex Vsp | Kurmannapalem | 15 | 24 | Yes | Vizag City | High | 24/24 stops (100%) within Vizag metro corridor |
| **DS03** | `ds03-duvvada-kurmannapalem` | Kurmannapalem | Duvvada | 2 | 3 | Yes | Vizag City | High | 3/3 stops (100%) within Vizag metro corridor |
| **DS24** | `ds24-new-gajuwaka-vadachipurapalli` | Vadachipurapalli | New Gajuwaka | 3 | 15 | Yes | Vizag City | High | 15/15 stops (100%) within Vizag metro corridor |
| **DS24** | `ds24-dosuru-rtc-complex-vsp` | Rtc Complex Vsp | Dosuru | 2 | 30 | Yes | Vizag City | High | 30/30 stops (100%) within Vizag metro corridor |
| **DS24** | `ds24-dosuru-new-gajuwaka` | Dosuru | New Gajuwaka | 2 | 19 | Yes | Vizag City | High | 19/19 stops (100%) within Vizag metro corridor |
| **DS24** | `ds24-scindia-vadachipurapalli` | Scindia | Vadachipurapalli | 1 | 18 | Yes | Vizag City | High | 18/18 stops (100%) within Vizag metro corridor |
| **DS31** | `ds31-jnnurm-colony-simhachalam` | Simhachalam | Jnnurm Colony | 3 | 15 | Yes | Vizag City | High | 15/15 stops (100%) within Vizag metro corridor |
| **DS31** | `ds31-duvvada-simhachalam-hill` | Duvvada | Simhachalam Hill | 3 | 14 | Yes | Vizag City | High | 14/14 stops (100%) within Vizag metro corridor |
| **DS32** | `ds32-duvvada-simhachalam` | Simhachalam | Duvvada | 5 | 13 | Yes | Vizag City | High | 13/13 stops (100%) within Vizag metro corridor |
| **DS32** | `ds32-jnnurm-colony-simhachalam-hill` | Simhachalam Hill | Jnnurm Colony | 1 | 16 | Yes | Vizag City | High | 16/16 stops (100%) within Vizag metro corridor |
| **DS41** | `ds41-old-head-post-office-simhachalam-depot` | Simhachalam Depot | Old Head Post Office | 6 | 14 | Yes | Vizag City | High | 14/14 stops (100%) within Vizag metro corridor |
| **DT01** | `dt01-rtc-complex-vsp-vakapalli` | Rtc Complex Vsp | Vakapalli | 4 | 34 | Yes | Vizag City | High | 34/34 stops (100%) within Vizag metro corridor |
| **DT01** | `dt01-anandapuram-rtc-complex-vsp` | Rtc Complex Vsp | Anandapuram | 2 | 24 | Yes | Vizag City | High | 24/24 stops (100%) within Vizag metro corridor |
| **DV05** | `dv05-devarapalle-rtc-complex-vsp` | Rtc Complex Vsp | Devarapalle | 81 | 29 | Yes | Vizag City | High | 29/29 stops (100%) within Vizag metro corridor |
| **F014** | `f014-simhachalam-simhachalam-hill` | Simhachalam Hill | Simhachalam | 20 | 2 | Yes | Vizag City | High | 2/2 stops (100%) within Vizag metro corridor |
| **F014** | `f014-simhachalam-depot-simhachalam-hill` | Simhachalam Depot | Simhachalam Hill | 5 | 4 | Yes | Vizag City | High | 4/4 stops (100%) within Vizag metro corridor |
| **F014** | `f014-gidijala-rtc-complex-vsp` | Gidijala | Rtc Complex Vsp | 2 | 21 | Yes | Vizag City | High | 21/21 stops (100%) within Vizag metro corridor |
| **F014** | `f014-kothavalasa-rtc-complex-vsp` | Rtc Complex Vsp | Kothavalasa | 2 | 22 | Yes | Vizag City | High | 22/22 stops (100%) within Vizag metro corridor |
| **F014** | `f014-bheemandorapalem-simhachalam-hill` | Simhachalam Hill | Bheemandorapalem | 1 | 13 | Yes | Vizag City | High | 13/13 stops (100%) within Vizag metro corridor |
| **F014** | `f014-bheemandorapalem-simhachalam-depot` | Bheemandorapalem | Simhachalam Depot | 1 | 11 | Yes | Vizag City | High | 11/11 stops (100%) within Vizag metro corridor |
| **F016** | `f016-r-k-beach-sabbavaram` | R.K.Beach | Sabbavaram | 7 | 51 | Yes | Vizag City | High | 51/51 stops (100%) within Vizag metro corridor |
| **F017** | `f017-r-k-beach-simhachalam-hill` | Simhachalam Hill | R.K.Beach | 66 | 20 | Yes | Vizag City | High | 20/20 stops (100%) within Vizag metro corridor |
| **F017** | `f017-gulivindada-r-k-beach` | Gulivindada | R.K.Beach | 6 | 22 | Yes | Vizag City | High | 22/22 stops (100%) within Vizag metro corridor |
| **F091** | `f091-r-k-beach-simhachalam` | R.K.Beach | Simhachalam | 58 | 19 | Yes | Vizag City | High | 19/19 stops (100%) within Vizag metro corridor |
| **G009** | `g009-kottavalasa-maddilapalem` | Maddilapalem | Kottavalasa | 50 | 16 | Yes | Vizag City | High | 16/16 stops (100%) within Vizag metro corridor |
| **G009** | `g009-maddilapalem-pendurthi` | Maddilapalem | Pendurthi | 24 | 11 | Yes | Vizag City | High | 11/11 stops (100%) within Vizag metro corridor |
| **G033** | `g033-bhimili-polytechnic-railway-station-vsp` | Railway Station-Vsp | Bhimili Polytechnic | 4 | 20 | Yes | Vizag City | High | 19/20 stops (95%) within Vizag metro corridor |
| **G034** | `g034-bhimili-polytechnic-rtc-complex-vsp` | Rtc Complex Vsp | Bhimili Polytechnic | 4 | 20 | Yes | Vizag City | High | 20/20 stops (100%) within Vizag metro corridor |
| **G035** | `g035-kottavalasa-r-k-beach` | R.K.Beach | Kottavalasa | 55 | 29 | Yes | Vizag City | High | 29/29 stops (100%) within Vizag metro corridor |
| **G035** | `g035-r-k-beach-waltair-depot` | R.K.Beach | Waltair Depot | 7 | 3 | Yes | Vizag City | High | 3/3 stops (100%) within Vizag metro corridor |
| **GA41** | `ga41-dbs-complex-theeda` | Theeda | Dbs Complex | 1 | 19 | Yes | Vizag City | Medium | 16/19 stops (84%) within Vizag metro corridor |
| **GA42** | `ga42-dbs-complex-totakurapalem` | Totakurapalem | Dbs Complex | 1 | 21 | Yes | Vizag City | Medium | 17/21 stops (81%) within Vizag metro corridor |
| **GC21** | `gc21-old-head-post-office-venkojipalem` | Old Head Post Office | Venkojipalem | 14 | 8 | Yes | Vizag City | High | 8/8 stops (100%) within Vizag metro corridor |
| **GC21** | `gc21-old-head-post-office-rtc-complex-vsp` | Old Head Post Office | Rtc Complex Vsp | 1 | 4 | Yes | Vizag City | High | 4/4 stops (100%) within Vizag metro corridor |
| **GC21** | `gc21-venkojipalem-waltair-depot` | Waltair Depot | Venkojipalem | 1 | 3 | Yes | Vizag City | High | 3/3 stops (100%) within Vizag metro corridor |
| **GH02** | `gh02-gwk-depot-old-gajuwaka` | Old Gajuwaka | Gwk Depot | 104 | 3 | Yes | Vizag City | High | 3/3 stops (100%) within Vizag metro corridor |
| **GH03** | `gh03-sriharipuram-cg-vudacol-ph2` | Sriharipuram-Cg | Vudacol-Ph2 | 4 | 5 | Yes | Vizag City | High | 5/5 stops (100%) within Vizag metro corridor |
| **GH04** | `gh04-r-k-beach-vudacol-ph2` | Vudacol-Ph2 | R.K.Beach | 16 | 19 | Yes | Vizag City | High | 19/19 stops (100%) within Vizag metro corridor |
| **GH06** | `gh06-sabbavaram-sriharipuram-cg` | Sabbavaram | Sriharipuram-Cg | 1 | 15 | Yes | Vizag City | High | 15/15 stops (100%) within Vizag metro corridor |
| **GH13** | `gh13-appikonda-part-r-k-beach` | Appikonda Part | R.K.Beach | 2 | 28 | Yes | Vizag City | High | 28/28 stops (100%) within Vizag metro corridor |
| **GK11** | `gk11-kottavalasa-scindia` | Scindia | Kottavalasa | 77 | 20 | Yes | Vizag City | High | 20/20 stops (100%) within Vizag metro corridor |
| **GO01** | `go01-gantyada-hb-colony-rtc-complex-vsp` | Gantyada Hb Colony | Rtc Complex Vsp | 26 | 14 | Yes | Vizag City | High | 13/14 stops (93%) within Vizag metro corridor |
| **GP01** | `gp01-kgpalem-rtc-complex-vsp` | Rtc Complex Vsp | Kgpalem | 9 | 40 | Yes | Vizag City | High | 34/40 stops (85%) within Vizag metro corridor |
| **GV99** | `gv99-gandavaram-rtc-complex-vsp` | Rtc Complex Vsp | Gandavaram | 2 | 30 | Yes | Vizag City | High | 30/30 stops (100%) within Vizag metro corridor |
| **GV99** | `gv99-kailasagiri-rtc-complex-vsp` | Kailasagiri | Rtc Complex Vsp | 1 | 8 | Yes | Vizag City | High | 8/8 stops (100%) within Vizag metro corridor |
| **GY01** | `gy01-rtc-complex-vsp-simhachalam-hill` | Rtc Complex Vsp | Simhachalam Hill | 12 | 11 | Yes | Vizag City | High | 11/11 stops (100%) within Vizag metro corridor |
| **H012** | `h012-gollala-endada-old-head-post-office` | Gollala Endada | Old Head Post Office | 5 | 9 | Yes | Vizag City | High | 9/9 stops (100%) within Vizag metro corridor |
| **H012** | `h012-gollala-endada-maddilapalem` | Maddilapalem | Gollala Endada | 3 | 5 | Yes | Vizag City | High | 5/5 stops (100%) within Vizag metro corridor |
| **HO21** | `ho21-kakaralova-ch-lova-rtc-complex-vsp` | Kakaralova-Ch.Lova | Rtc Complex Vsp | 9 | 15 | Yes | Vizag City | High | 15/15 stops (100%) within Vizag metro corridor |
| **HO21** | `ho21-gwk-depot-kakaralova-ch-lova` | Gwk Depot | Kakaralova-Ch.Lova | 2 | 4 | Yes | Vizag City | High | 4/4 stops (100%) within Vizag metro corridor |
| **HO81** | `ho81-gwk-depot-rtc-complex-vsp` | Rtc Complex Vsp | Gwk Depot | 1 | 13 | Yes | Vizag City | Medium | 13/13 stops (100%) within Vizag metro corridor |
| **IT02** | `it02-railway-station-vsp-vizianagaram` | Railway Station Vsp | Vizianagaram | 54 | 30 | Yes | Vizag City | High | 26/30 stops (87%) within Vizag metro corridor |
| **IT02** | `it02-hill-no-2-railway-station-vsp` | Hill No 2 | Railway Station Vsp | 7 | 15 | Yes | Vizag City | High | 15/15 stops (100%) within Vizag metro corridor |
| **J011** | `j011-scindia-simhachalam-hill` | Scindia | Simhachalam Hill | 37 | 14 | Yes | Vizag City | High | 14/14 stops (100%) within Vizag metro corridor |
| **J082** | `j082-scindia-simhachalam` | Simhachalam | Scindia | 97 | 23 | Yes | Vizag City | High | 23/23 stops (100%) within Vizag metro corridor |
| **JN01** | `jn01-rtc-complex-vsp-sector-5` | Sector-5 | Rtc Complex Vsp | 43 | 16 | Yes | Vizag City | High | 16/16 stops (100%) within Vizag metro corridor |
| **JN01** | `jn01-kurmannapalem-sector-5` | Sector-5 | Kurmannapalem | 6 | 4 | Yes | Vizag City | High | 4/4 stops (100%) within Vizag metro corridor |
| **JN02** | `jn02-r-k-beach-tungalam` | Tungalam | R.K.Beach | 8 | 19 | Yes | Vizag City | High | 19/19 stops (100%) within Vizag metro corridor |
| **JN02** | `jn02-sriharipuram-cg-tungalam` | Tungalam | Sriharipuram-Cg | 2 | 5 | Yes | Vizag City | High | 5/5 stops (100%) within Vizag metro corridor |
| **JN02** | `jn02-kurmannapalem-vsp-sector-5` | Sector-5 | Kurmannapalem-Vsp | 2 | 4 | Yes | Vizag City | High | 4/4 stops (100%) within Vizag metro corridor |
| **JN04** | `jn04-rtc-complex-vsp-vadachipurapalli` | Rtc Complex Vsp | Vadachipurapalli | 11 | 26 | Yes | Vizag City | High | 26/26 stops (100%) within Vizag metro corridor |
| **JN08** | `jn08-gangavaram-colony-r-k-beach` | R.K.Beach | Gangavaram Colony | 3 | 20 | Yes | Vizag City | High | 20/20 stops (100%) within Vizag metro corridor |
| **JN14** | `jn14-railway-station-vsp-vizianagaram` | Railway Station-Vsp | Vizianagaram | 74 | 22 | Yes | Vizag City | High | 19/22 stops (86%) within Vizag metro corridor |
| **JN15** | `jn15-old-gajuwaka-r-k-beach` | Old Gajuwaka | R.K.Beach | 2 | 17 | Yes | Vizag City | Medium | 17/17 stops (100%) within Vizag metro corridor |
| **JN22** | `jn22-kinthali-rtc-complex-vsp` | Rtc Complex Vsp | Kinthali | 4 | 35 | Yes | Vizag City | High | 28/35 stops (80%) within Vizag metro corridor |
| **JN22** | `jn22-railway-station-vsp-rtc-complex-vsp` | Rtc Complex Vsp | Railway Station Vsp | 1 | 2 | Yes | Vizag City | High | 2/2 stops (100%) within Vizag metro corridor |
| **JN22** | `jn22-railway-station-vsp-rushikonda` | Railway Station-Vsp | Rushikonda | 1 | 10 | Yes | Vizag City | High | 10/10 stops (100%) within Vizag metro corridor |
| **JN22** | `jn22-rushikonda-waltair` | Rushikonda | Waltair | 1 | 6 | Yes | Vizag City | High | 6/6 stops (100%) within Vizag metro corridor |
| **JN24** | `jn24-kurmannapalem-vadachipurapalli` | Kurmannapalem | Vadachipurapalli | 1 | 12 | Yes | Vizag City | High | 12/12 stops (100%) within Vizag metro corridor |
| **JN24** | `jn24-mutyalammapalem-new-gajuwaka` | New Gajuwaka | Mutyalammapalem | 1 | 17 | Yes | Vizag City | High | 17/17 stops (100%) within Vizag metro corridor |
| **JN24** | `jn24-mutyalammapalem-rtc-complex-vsp` | Mutyalammapalem | Rtc Complex Vsp | 1 | 28 | Yes | Vizag City | High | 28/28 stops (100%) within Vizag metro corridor |
| **JN65** | `jn65-anakapalli-rtc-complex-vsp` | Rtc Complex Vsp | Anakapalli | 1 | 19 | Yes | Vizag City | Medium | 19/19 stops (100%) within Vizag metro corridor |
| **JN95** | `jn95-cheedipalle-rtc-complex-vsp` | Rtc Complex Vsp | Cheedipalle | 2 | 27 | Yes | Vizag City | High | 27/27 stops (100%) within Vizag metro corridor |
| **JO03** | `jo03-gangavaram-colony-rtc-complex-vsp` | Gangavaram Colony | Rtc Complex Vsp | 9 | 16 | Yes | Vizag City | High | 16/16 stops (100%) within Vizag metro corridor |
| **JO22** | `jo22-gwk-depot-kranthinagar` | Gwk Depot | Kranthinagar | 1 | 3 | Yes | Vizag City | High | 3/3 stops (100%) within Vizag metro corridor |
| **JO71** | `jo71-gantyada-hb-colony-rtc-complex-vsp` | Gantyada Hb Colony | Rtc Complex Vsp | 1 | 14 | Yes | Vizag City | Medium | 13/14 stops (93%) within Vizag metro corridor |
| **JP01** | `jp01-old-gajuwaka-vizianagaram` | Old Gajuwaka | Vizianagaram | 72 | 30 | Yes | Vizag City | High | 28/30 stops (93%) within Vizag metro corridor |
| **K092** | `k092-devarapalle-r-k-beach` | R.K.Beach | Devarapalle | 6 | 34 | Yes | Vizag City | High | 34/34 stops (100%) within Vizag metro corridor |
| **K121** | `k121-bheemunipatnam-rtc-complex-vsp` | Rtc Complex Vsp | Bheemunipatnam | 91 | 32 | Yes | Vizag City | High | 31/32 stops (97%) within Vizag metro corridor |
| **K151** | `k151-rtc-complex-vsp-yelamanchili` | Yelamanchili | Rtc Complex Vsp | 175 | 58 | Yes | Vizag City | High | 52/58 stops (90%) within Vizag metro corridor |
| **KG01** | `kg01-kailasagiri-railway-station-vsp` | Railway Station Vsp | Kailasagiri | 46 | 9 | Yes | Vizag City | High | 9/9 stops (100%) within Vizag metro corridor |
| **KG01** | `kg01-kgpalem-maddilapalem-city-bus-stop` | Maddilapalem City Bus Stop | Kgpalem | 5 | 38 | Yes | Vizag City | High | 32/38 stops (84%) within Vizag metro corridor |
| **KG01** | `kg01-gwk-depot-maddilapalem` | Gwk Depot | Maddilapalem | 3 | 13 | Yes | Vizag City | High | 13/13 stops (100%) within Vizag metro corridor |
| **KG02** | `kg02-kothapatnam-rtc-complex-vsp` | Rtc Complex Vsp | Kothapatnam | 2 | 41 | Yes | Vizag City | High | 34/41 stops (83%) within Vizag metro corridor |
| **KM02** | `km02-amaravathi-colony-old-head-post-office` | Amaravathi Colony | Old Head Post Office | 24 | 14 | Yes | Vizag City | High | 14/14 stops (100%) within Vizag metro corridor |
| **KP01** | `kp01-atchayyapalm-rtc-complex-vsp` | Rtc Complex Vsp | Atchayyapalm | 2 | 28 | Yes | Vizag City | High | 28/28 stops (100%) within Vizag metro corridor |
| **KT51** | `kt51-maddilapalem-pendurthi` | Maddilapalem | Pendurthi | 1 | 11 | Yes | Vizag City | Medium | 11/11 stops (100%) within Vizag metro corridor |
| **KT51** | `kt51-kottavalasa-maddilapalem` | Maddilapalem | Kottavalasa | 1 | 16 | Yes | Vizag City | Medium | 16/16 stops (100%) within Vizag metro corridor |
| **KV01** | `kv01-new-kovvada-railway-station-vsp` | Railway Station Vsp | New Kovvada | 6 | 29 | Yes | Vizag City | High | 29/29 stops (100%) within Vizag metro corridor |
| **KV03** | `kv03-pendurthi-r-k-beach` | R.K.Beach | Pendurthi | 13 | 15 | Yes | Vizag City | High | 15/15 stops (100%) within Vizag metro corridor |
| **KV03** | `kv03-pendurthi-simhachalam-depot` | Pendurthi | Simhachalam Depot | 5 | 5 | Yes | Vizag City | High | 5/5 stops (100%) within Vizag metro corridor |
| **KV07** | `kv07-maddilapalem-padmanabham` | Maddilapalem | Padmanabham | 6 | 28 | Yes | Vizag City | High | 28/28 stops (100%) within Vizag metro corridor |
| **KVP1** | `kvp1-anakapalli-visakhapatnam` | Visakhapatnam | Anakapalli | 2 | 10 | Yes | Vizag City | Medium | 10/10 stops (100%) within Vizag metro corridor |
| **LA24** | `la24-anakapalli-rtc-complex-vsp` | Rtc Complex Vsp | Anakapalli | 5 | 40 | Yes | Vizag City | High | 40/40 stops (100%) within Vizag metro corridor |
| **LA24** | `la24-lankelapalem-rtc-complex-vsp` | Lankelapalem | Rtc Complex Vsp | 2 | 27 | Yes | Vizag City | High | 27/27 stops (100%) within Vizag metro corridor |
| **LA24** | `la24-kurmannapalem-vsp-rtc-complex-vsp` | Rtc Complex Vsp | Kurmannapalem-Vsp | 1 | 15 | Yes | Vizag City | High | 15/15 stops (100%) within Vizag metro corridor |
| **LK92** | `lk92-kurmannapalem-maddilapalem-city-busstop` | Kurmannapalem | Maddilapalem City Busstop | 4 | 13 | Yes | Vizag City | High | 13/13 stops (100%) within Vizag metro corridor |
| **LK92** | `lk92-sector-11-vizianagaram` | Sector-11 | Vizianagaram | 1 | 42 | Yes | Vizag City | High | 39/42 stops (93%) within Vizag metro corridor |
| **LK92** | `lk92-kurmannapalem-sector-11` | Kurmannapalem | Sector-11 | 1 | 4 | Yes | Vizag City | High | 4/4 stops (100%) within Vizag metro corridor |
| **MG80** | `mg80-butchayyapeta-rtc-complex-vsp` | Rtc Complex Vsp | Butchayyapeta | 2 | 28 | Yes | Vizag City | High | 24/28 stops (86%) within Vizag metro corridor |
| **MG83** | `mg83-madugula-rtc-complex-vsp` | Rtc Complex Vsp | Madugula | 2 | 28 | Yes | Vizag City | Medium | 24/28 stops (86%) within Vizag metro corridor |
| **MK01** | `mk01-boravanipalem-mdwd-depot` | Boravanipalem | Mdwd Depot | 9 | 4 | Yes | Vizag City | High | 4/4 stops (100%) within Vizag metro corridor |
| **MK01** | `mk01-boravanipalem-railway-station-vsp` | Boravanipalem | Railway Station Vsp | 5 | 11 | Yes | Vizag City | High | 11/11 stops (100%) within Vizag metro corridor |
| **MK03** | `mk03-anandapuram-r-k-beach` | R.K.Beach | Anandapuram | 12 | 17 | Yes | Vizag City | High | 17/17 stops (100%) within Vizag metro corridor |
| **MK03** | `mk03-boravanipalem-collector-office` | Boravanipalem | Collector Office | 1 | 12 | Yes | Vizag City | High | 12/12 stops (100%) within Vizag metro corridor |
| **MK03** | `mk03-anandapuram-collector-office` | Collector Office | Anandapuram | 1 | 16 | Yes | Vizag City | High | 16/16 stops (100%) within Vizag metro corridor |
| **MK04** | `mk04-r-k-beach-vambay-colony` | R.K.Beach | Vambay Colony | 1 | 11 | Yes | Vizag City | High | 11/11 stops (100%) within Vizag metro corridor |
| **MK04** | `mk04-anandapuram-railway-station-vsp` | Railway Station Vsp | Anandapuram | 1 | 15 | Yes | Vizag City | High | 15/15 stops (100%) within Vizag metro corridor |
| **MK05** | `mk05-boravanipalem-r-k-beach` | Boravanipalem | R.K.Beach | 39 | 13 | Yes | Vizag City | High | 13/13 stops (100%) within Vizag metro corridor |
| **N071** | `n071-visakhapatnam-vizianagaram` | Vizianagaram | Visakhapatnam | 152 | 12 | Yes | Vizag City | Medium | 10/12 stops (83%) within Vizag metro corridor |
| **N085** | `n085-amanam-railway-station-vsp` | Railway Station Vsp | Amanam | 6 | 23 | Yes | Vizag City | High | 23/23 stops (100%) within Vizag metro corridor |
| **N099** | `n099-hill-no-2-vizianagaram` | Hill No 2 | Vizianagaram | 4 | 25 | Yes | Vizag City | High | 21/25 stops (84%) within Vizag metro corridor |
| **N099** | `n099-appughar-kailasagiri` | Kailasagiri | Appughar | 2 | 3 | Yes | Vizag City | High | 3/3 stops (100%) within Vizag metro corridor |
| **N099** | `n099-hill-no-2-kailasagiri` | Kailasagiri | Hill No 2 | 1 | 8 | Yes | Vizag City | High | 8/8 stops (100%) within Vizag metro corridor |
| **NG01** | `ng01-town-koth-raod-ysr-nagar` | Ysr Nagar | Town Koth Raod | 3 | 13 | Yes | Vizag City | High | 13/13 stops (100%) within Vizag metro corridor |
| **NG01** | `ng01-railway-station-vsp-ysr-nagar` | Ysr Nagar | Railway Station Vsp | 2 | 10 | Yes | Vizag City | High | 10/10 stops (100%) within Vizag metro corridor |
| **NG01** | `ng01-madhurawada-depot-ysr-nagar` | Madhurawada Depot | Ysr Nagar | 1 | 3 | Yes | Vizag City | High | 3/3 stops (100%) within Vizag metro corridor |
| **NG02** | `ng02-town-koth-raod-vambay-colony` | Town Koth Raod | Vambay Colony | 13 | 11 | Yes | Vizag City | High | 11/11 stops (100%) within Vizag metro corridor |
| **NG02** | `ng02-madhurawada-depot-vambay-colony` | Vambay Colony | Madhurawada Depot | 4 | 2 | Yes | Vizag City | High | 2/2 stops (100%) within Vizag metro corridor |
| **NO12** | `no12-devarapalle-sriharipuram-cg` | Sriharipuram-Cg | Devarapalle | 14 | 40 | Yes | Vizag City | High | 40/40 stops (100%) within Vizag metro corridor |
| **NO12** | `no12-singanddorapalem-sriharipuram-cg` | Sriharipuram-Cg | Singanddorapalem | 2 | 25 | Yes | Vizag City | High | 25/25 stops (100%) within Vizag metro corridor |
| **NO31** | `no31-gwk-depot-yarada-village` | Gwk Depot | Yarada Village | 2 | 8 | Yes | Vizag City | High | 8/8 stops (100%) within Vizag metro corridor |
| **OR92** | `or92-old-gajuwaka-r-k-beach` | Old Gajuwaka | R.K.Beach | 120 | 17 | Yes | Vizag City | High | 17/17 stops (100%) within Vizag metro corridor |
| **OR92** | `or92-sriharipuram-cg-vangali` | Sriharipuram-Cg | Vangali | 1 | 19 | Yes | Vizag City | High | 19/19 stops (100%) within Vizag metro corridor |
| **OR92** | `or92-r-k-beach-vangali` | Vangali | R.K.Beach | 1 | 33 | Yes | Vizag City | High | 33/33 stops (100%) within Vizag metro corridor |
| **P031** | `p031-vyachalam-waltair-depot` | Vyachalam | Waltair Depot | 2 | 36 | Yes | Vizag City | High | 36/36 stops (100%) within Vizag metro corridor |
| **P031** | `p031-koduru-waltair-depot` | Waltair Depot | Koduru | 1 | 30 | Yes | Vizag City | High | 29/30 stops (97%) within Vizag metro corridor |
| **P031** | `p031-koduru-oldbusstand-vsp` | Koduru | Oldbusstand-Vsp | 1 | 25 | Yes | Vizag City | High | 25/25 stops (100%) within Vizag metro corridor |
| **P031** | `p031-k-kotapadu-vsp-town-kotharoad` | Town Kotharoad | K Kotapadu-Vsp | 1 | 26 | Yes | Vizag City | High | 26/26 stops (100%) within Vizag metro corridor |
| **P031** | `p031-k-kotapadu-vsp-marrivalasa` | K Kotapadu-Vsp | Marrivalasa | 1 | 5 | Yes | Vizag City | High | 5/5 stops (100%) within Vizag metro corridor |
| **P031** | `p031-marrivalasa-mvp-rythu-bajar` | Marrivalasa | Mvp Rythu Bajar | 1 | 23 | Yes | Vizag City | High | 22/23 stops (96%) within Vizag metro corridor |
| **P031** | `p031-mvp-rythu-bajar-oldbusstand-vsp` | Mvp Rythu Bajar | Oldbusstand-Vsp | 1 | 6 | Yes | Vizag City | High | 6/6 stops (100%) within Vizag metro corridor |
| **P034** | `p034-oldbusstand-vsp-vyachalam` | Oldbusstand-Vsp | Vyachalam | 3 | 30 | Yes | Vizag City | High | 30/30 stops (100%) within Vizag metro corridor |
| **P034** | `p034-town-kotharoad-vyachalam` | Town Kotharoad | Vyachalam | 1 | 33 | Yes | Vizag City | High | 33/33 stops (100%) within Vizag metro corridor |
| **P034** | `p034-k-kotapadu-vsp-oldbusstand-vsp` | Oldbusstand-Vsp | K Kotapadu-Vsp | 1 | 23 | Yes | Vizag City | High | 23/23 stops (100%) within Vizag metro corridor |
| **P041** | `p041-kothapeta-kgpalem-visakhapatnam` | Visakhapatnam | Kothapeta-Kgpalem | 4 | 17 | Yes | Vizag City | Medium | 14/17 stops (82%) within Vizag metro corridor |
| **P041** | `p041-ramayogi-agraharam-waltair-depot` | Ramayogi Agraharam | Waltair Depot | 2 | 39 | Yes | Vizag City | High | 39/39 stops (100%) within Vizag metro corridor |
| **P041** | `p041-oldbusstand-vsp-ramayogi-agraharam` | Ramayogi Agraharam | Oldbusstand-Vsp | 1 | 27 | Yes | Vizag City | High | 27/27 stops (100%) within Vizag metro corridor |
| **P041** | `p041-koduru-town-kotharoad` | Town Kotharoad | Koduru | 1 | 28 | Yes | Vizag City | High | 28/28 stops (100%) within Vizag metro corridor |
| **P041** | `p041-koduru-santhapalem` | Koduru | Santhapalem | 1 | 6 | Yes | Vizag City | High | 6/6 stops (100%) within Vizag metro corridor |
| **P041** | `p041-mvp-rythu-bajar-santhapalem` | Santhapalem | Mvp Rythu Bajar | 1 | 21 | Yes | Vizag City | High | 21/21 stops (100%) within Vizag metro corridor |
| **P041** | `p041-mvp-rythu-bajar-ramayogi-agraharam` | Mvp Rythu Bajar | Ramayogi Agraharam | 1 | 29 | Yes | Vizag City | High | 29/29 stops (100%) within Vizag metro corridor |
| **PM01** | `pm01-madhurawada-depot-pudimadaka` | Madhurawada Depot | Pudimadaka | 2 | 37 | Yes | Vizag City | High | 36/37 stops (97%) within Vizag metro corridor |
| **PM01** | `pm01-pudimadaka-rtc-complex-vsp` | Pudimadaka | Rtc Complex Vsp | 2 | 31 | Yes | Vizag City | High | 30/31 stops (97%) within Vizag metro corridor |
| **PO12** | `po12-appikonda-part-gwk-depot` | Gwk Depot | Appikonda Part | 13 | 14 | Yes | Vizag City | High | 14/14 stops (100%) within Vizag metro corridor |
| **PO12** | `po12-palavalasa-sriharipuram-cg` | Sriharipuram-Cg | Palavalasa | 2 | 14 | Yes | Vizag City | High | 14/14 stops (100%) within Vizag metro corridor |
| **PP01** | `pp01-mdwd-depot-pothinamallayyapalem` | Mdwd Depot | Pothinamallayyapalem | 23 | 3 | Yes | Vizag City | High | 3/3 stops (100%) within Vizag metro corridor |
| **PP04** | `pp04-old-head-post-office-pothinamallayyapalem` | Old Head Post Office | Pothinamallayyapalem | 4 | 11 | Yes | Vizag City | Medium | 11/11 stops (100%) within Vizag metro corridor |
| **PP18** | `pp18-pothinamallayyapalem-r-k-beach` | R.K.Beach | Pothinamallayyapalem | 17 | 13 | Yes | Vizag City | High | 13/13 stops (100%) within Vizag metro corridor |
| **PP18** | `pp18-madhurawada-depot-shambuvanipalem` | Madhurawada Depot | Shambuvanipalem | 1 | 5 | Yes | Vizag City | High | 5/5 stops (100%) within Vizag metro corridor |
| **PP18** | `pp18-old-head-post-office-shambuvanipalem` | Shambuvanipalem | Old Head Post Office | 1 | 13 | Yes | Vizag City | High | 13/13 stops (100%) within Vizag metro corridor |
| **PP19** | `pp19-madhurawada-depot-pothinamallayyapalem` | Madhurawada Depot | Pothinamallayyapalem | 2 | 3 | Yes | Vizag City | High | 3/3 stops (100%) within Vizag metro corridor |
| **PP20** | `pp20-old-head-post-office-pothinamallayyapalem` | Pothinamallayyapalem | Old Head Post Office | 101 | 11 | Yes | Vizag City | High | 11/11 stops (100%) within Vizag metro corridor |
| **RJ01** | `rj01-rtc-complex-vsp-vizianagaram` | Rtc Complex Vsp | Vizianagaram | 42 | 30 | Yes | Vizag City | High | 26/30 stops (87%) within Vizag metro corridor |
| **RJ03** | `rj03-rajivnagar-rtc-complex-vsp` | Rtc Complex Vsp | Rajivnagar | 1 | 15 | Yes | Vizag City | High | 15/15 stops (100%) within Vizag metro corridor |
| **RT24** | `rt24-kollivaniapalem-new-gajuwaka` | Kollivaniapalem | New Gajuwaka | 1 | 16 | Yes | Vizag City | High | 16/16 stops (100%) within Vizag metro corridor |
| **RT24** | `rt24-old-gajuwaka-tikkavanipalem` | Tikkavanipalem | Old Gajuwaka | 1 | 16 | Yes | Vizag City | High | 16/16 stops (100%) within Vizag metro corridor |
| **S004** | `s004-mvp-colony-thavvavanipalem` | Thavvavanipalem | Mvp Colony | 1 | 19 | Yes | Vizag City | High | 19/19 stops (100%) within Vizag metro corridor |
| **S372** | `s372-maddilapalem-mvp-colony` | Maddilapalem | Mvp Colony | 2 | 3 | Yes | Vizag City | High | 3/3 stops (100%) within Vizag metro corridor |
| **SK31** | `sk31-devarapalle-r-k-beach` | Devarapalle | R.K.Beach | 3 | 34 | Yes | Vizag City | Medium | 34/34 stops (100%) within Vizag metro corridor |
| **SK31** | `sk31-r-k-beach-simhachalam-depot` | R.K.Beach | Simhachalam Depot | 1 | 14 | Yes | Vizag City | Medium | 14/14 stops (100%) within Vizag metro corridor |
| **SV01** | `sv01-madhurawada-depot-seva-nagar` | Madhurawada Depot | Seva Nagar | 1 | 5 | Yes | Vizag City | High | 5/5 stops (100%) within Vizag metro corridor |
| **SV01** | `sv01-railway-station-vsp-seva-nagar` | Railway Station Vsp | Seva Nagar | 1 | 11 | Yes | Vizag City | High | 11/11 stops (100%) within Vizag metro corridor |
| **TG32** | `tg32-annavaram-railway-station-vsp` | Railway Station Vsp | Annavaram | 8 | 24 | Yes | Vizag City | High | 24/24 stops (100%) within Vizag metro corridor |
| **TN92** | `tn92-purnamarket-vsp-thanam` | Thanam | Purnamarket-Vsp | 1 | 24 | Yes | Vizag City | High | 24/24 stops (100%) within Vizag metro corridor |
| **TO12** | `to12-sriharipuram-cg-swayambuvaram` | Swayambuvaram | Sriharipuram-Cg | 4 | 16 | Yes | Vizag City | High | 16/16 stops (100%) within Vizag metro corridor |
| **TV03** | `tv03-railway-station-vsp-tagarapu-valasa-citybus-stop` | Railway Station Vsp | Tagarapu Valasa Citybus Stop | 132 | 18 | Yes | Vizag City | High | 18/18 stops (100%) within Vizag metro corridor |
| **V016** | `v016-bheemunipatnam-rtc-complex-vsp` | Rtc Complex Vsp | Bheemunipatnam | 1 | 18 | Yes | Vizag City | Medium | 18/18 stops (100%) within Vizag metro corridor |
| **V027** | `v027-arli-mvp-rythu-bajar` | Arli | Mvp Rythu Bajar | 1 | 27 | Yes | Vizag City | High | 27/27 stops (100%) within Vizag metro corridor |
| **V027** | `v027-gavaravaram-waltair-depot` | Waltair Depot | Gavaravaram | 1 | 35 | Yes | Vizag City | High | 35/35 stops (100%) within Vizag metro corridor |
| **VD24** | `vd24-nunaparti-purnamarket-vsp` | Nunaparti | Purnamarket-Vsp | 1 | 28 | Yes | Vizag City | Medium | 28/28 stops (100%) within Vizag metro corridor |
| **VZ13** | `vz13-kurmannapalem-vizianagaram` | Kurmannapalem | Vizianagaram | 95 | 42 | Yes | Vizag City | High | 39/42 stops (93%) within Vizag metro corridor |
| **ZH11** | `zh11-simhachalam-zp-by-coffice` | Zp By Coffice | Simhachalam | 1 | 11 | Yes | Vizag City | Medium | 11/11 stops (100%) within Vizag metro corridor |

## 3. Audit Table: Visakhapatnam Regional / Feeder Routes

| Route No | Route ID | Origin | Destination | Trips | Stops | Geometry | Classification | Conf. | Classification Reason |
|---|---|---|---|---|---|---|---|---|---|
| **02664** | `neo-02664` | Vsp Maddilapalem City Bus Station | Kakinada | 1 | 13 | No | Vizag Regional | Medium | Regional feeder connecting Vizag metro (8 stops) with peri-urban centers |
| **02696** | `neo-02696` | Vsp Maddilapalem City Bus Station | Kakinada | 1 | 12 | No | Vizag Regional | Medium | Regional feeder connecting Vizag metro (7 stops) with peri-urban centers |
| **02924** | `neo-02924` | Srikakulam | Vijayawada | 1 | 34 | No | Vizag Regional | Medium | Regional feeder connecting Vizag metro (19 stops) with peri-urban centers |
| **02967** | `neo-02967` | Srikakulam | Vijayawada | 1 | 30 | No | Vizag Regional | Medium | Regional feeder connecting Vizag metro (19 stops) with peri-urban centers |
| **02983** | `neo-02983` | Srikakulam | Vijayawada | 1 | 32 | No | Vizag Regional | Medium | Regional feeder connecting Vizag metro (17 stops) with peri-urban centers |
| **03066** | `neo-03066` | Palasa | Vijayawada | 1 | 29 | No | Vizag Regional | Medium | Regional feeder connecting Vizag metro (16 stops) with peri-urban centers |
| **03070** | `neo-03070` | Palasa | Vijayawada | 1 | 31 | No | Vizag Regional | Medium | Regional feeder connecting Vizag metro (18 stops) with peri-urban centers |
| **03088** | `neo-03088` | Tekkali | Vijayawada | 1 | 43 | No | Vizag Regional | Medium | Regional feeder connecting Vizag metro (19 stops) with peri-urban centers |
| **03333** | `neo-03333` | Vsp Maddilapalem City Bus Station | Kakinada | 1 | 12 | No | Vizag Regional | Medium | Regional feeder connecting Vizag metro (8 stops) with peri-urban centers |
| **03341** | `neo-03341` | Vsp Maddilapalem City Bus Station | Amalapuram | 1 | 16 | No | Vizag Regional | Medium | Regional feeder connecting Vizag metro (7 stops) with peri-urban centers |
| **03445** | `neo-03445` | Madhurawada Depot | Vijayawada | 1 | 34 | No | Vizag Regional | Medium | Regional feeder connecting Vizag metro (21 stops) with peri-urban centers |
| **03463** | `neo-03463` | Visakhapatnam | Vijayawada | 1 | 23 | No | Vizag Regional | Medium | Regional feeder connecting Vizag metro (11 stops) with peri-urban centers |
| **03471** | `neo-03471` | Vsp Maddilapalem City Bus Station | Amalapuram | 1 | 16 | No | Vizag Regional | Medium | Regional feeder connecting Vizag metro (7 stops) with peri-urban centers |
| **03487** | `neo-03487` | Visakhapatnam | Vijayawada | 1 | 22 | No | Vizag Regional | Medium | Regional feeder connecting Vizag metro (10 stops) with peri-urban centers |
| **03775** | `neo-03775` | Visakhapatnam | Autonagar Bus Station | 1 | 28 | No | Vizag Regional | Medium | Regional feeder connecting Vizag metro (11 stops) with peri-urban centers |
| **03979** | `neo-03979` | Visakhapatnam | Autonagar Bus Station | 1 | 28 | No | Vizag Regional | Medium | Regional feeder connecting Vizag metro (11 stops) with peri-urban centers |
| **04058** | `neo-04058` | Autonagar Bus Station | Visakhapatnam | 1 | 29 | No | Vizag Regional | Medium | Regional feeder connecting Vizag metro (11 stops) with peri-urban centers |
| **04059** | `neo-04059` | Visakhapatnam | Autonagar Bus Station | 1 | 28 | No | Vizag Regional | Medium | Regional feeder connecting Vizag metro (11 stops) with peri-urban centers |
| **04445** | `neo-04445` | Visakhapatnam | Autonagar Bus Station | 1 | 27 | No | Vizag Regional | Medium | Regional feeder connecting Vizag metro (11 stops) with peri-urban centers |
| **04757** | `neo-04757` | Vijayawada | Visakhapatnam | 1 | 27 | No | Vizag Regional | Medium | Regional feeder connecting Vizag metro (11 stops) with peri-urban centers |
| **04758** | `neo-04758` | Visakhapatnam | Autonagar Bus Station | 1 | 27 | No | Vizag Regional | Medium | Regional feeder connecting Vizag metro (11 stops) with peri-urban centers |
| **04929** | `neo-04929` | Narsapuram | Mvp City Complex | 1 | 24 | No | Vizag Regional | Medium | Regional feeder connecting Vizag metro (10 stops) with peri-urban centers |
| **04955** | `neo-04955` | Jangareddy Gudem | Visakhapatnam | 1 | 20 | No | Vizag Regional | Medium | Regional feeder connecting Vizag metro (8 stops) with peri-urban centers |
| **09367** | `neo-09367` | Visakhapatnam | Autonagar Bus Station | 1 | 28 | No | Vizag Regional | Medium | Regional feeder connecting Vizag metro (11 stops) with peri-urban centers |
| **09461** | `neo-09461` | Visakhapatnam | Autonagar Bus Station | 1 | 28 | No | Vizag Regional | Medium | Regional feeder connecting Vizag metro (11 stops) with peri-urban centers |
| **09478** | `neo-09478` | Visakhapatnam | Autonagar Bus Station | 1 | 28 | No | Vizag Regional | Medium | Regional feeder connecting Vizag metro (11 stops) with peri-urban centers |
| **09497** | `neo-09497` | Visakhapatnam | Autonagar Bus Station | 1 | 28 | No | Vizag Regional | Medium | Regional feeder connecting Vizag metro (11 stops) with peri-urban centers |
| **21449** | `neo-21449` | Kakinada | Visakhapatnam | 1 | 2 | No | Vizag Regional | Medium | Regional feeder connecting Vizag metro (1 stops) with peri-urban centers |
| **27014** | `neo-27014` | Vsp Maddilapalem City Bus Station | Kakinada | 1 | 11 | No | Vizag Regional | Medium | Regional feeder connecting Vizag metro (7 stops) with peri-urban centers |
| **27024** | `neo-27024` | Anakapalli | Parlakimidi | 1 | 17 | No | Vizag Regional | Medium | Regional feeder connecting Vizag metro (8 stops) with peri-urban centers |
| **27025** | `neo-27025` | Parlakimidi | Anakapalli | 1 | 17 | No | Vizag Regional | Medium | Regional feeder connecting Vizag metro (8 stops) with peri-urban centers |
| **27069** | `neo-27069` | Rajamahendravaram | Vsp Maddilapalem City Bus Station | 1 | 11 | No | Vizag Regional | Medium | Regional feeder connecting Vizag metro (4 stops) with peri-urban centers |
| **27194** | `neo-27194` | Visakhapatnam | Ichapuram | 1 | 18 | No | Vizag Regional | Medium | Regional feeder connecting Vizag metro (10 stops) with peri-urban centers |
| **27195** | `neo-27195` | Ichapuram | Visakhapatnam | 1 | 13 | No | Vizag Regional | Medium | Regional feeder connecting Vizag metro (5 stops) with peri-urban centers |
| **27203** | `neo-27203` | Visakhapatnam | Ichapuram | 1 | 17 | No | Vizag Regional | Medium | Regional feeder connecting Vizag metro (9 stops) with peri-urban centers |
| **27204** | `neo-27204` | Ichapuram | Visakhapatnam | 1 | 13 | No | Vizag Regional | Medium | Regional feeder connecting Vizag metro (5 stops) with peri-urban centers |
| **27205** | `neo-27205` | Visakhapatnam | Ichapuram | 1 | 17 | No | Vizag Regional | Medium | Regional feeder connecting Vizag metro (9 stops) with peri-urban centers |
| **27206** | `neo-27206` | Ichapuram | Visakhapatnam | 1 | 13 | No | Vizag Regional | Medium | Regional feeder connecting Vizag metro (5 stops) with peri-urban centers |
| **27207** | `neo-27207` | Visakhapatnam | Ichapuram | 1 | 17 | No | Vizag Regional | Medium | Regional feeder connecting Vizag metro (9 stops) with peri-urban centers |
| **27209** | `neo-27209` | Visakhapatnam | Ichapuram | 1 | 16 | No | Vizag Regional | Medium | Regional feeder connecting Vizag metro (8 stops) with peri-urban centers |
| **27210** | `neo-27210` | Ichapuram | Visakhapatnam | 1 | 13 | No | Vizag Regional | Medium | Regional feeder connecting Vizag metro (5 stops) with peri-urban centers |
| **27211** | `neo-27211` | Visakhapatnam | Ichapuram | 1 | 17 | No | Vizag Regional | Medium | Regional feeder connecting Vizag metro (9 stops) with peri-urban centers |
| **27212** | `neo-27212` | Ichapuram | Visakhapatnam | 1 | 13 | No | Vizag Regional | Medium | Regional feeder connecting Vizag metro (5 stops) with peri-urban centers |
| **27217** | `neo-27217` | Visakhapatnam | Ichapuram | 1 | 16 | No | Vizag Regional | Medium | Regional feeder connecting Vizag metro (8 stops) with peri-urban centers |
| **27218** | `neo-27218` | Ichapuram | Visakhapatnam | 1 | 13 | No | Vizag Regional | Medium | Regional feeder connecting Vizag metro (5 stops) with peri-urban centers |
| **27219** | `neo-27219` | Visakhapatnam | Ichapuram | 1 | 14 | No | Vizag Regional | Medium | Regional feeder connecting Vizag metro (6 stops) with peri-urban centers |
| **27220** | `neo-27220` | Ichapuram | Visakhapatnam | 1 | 13 | No | Vizag Regional | Medium | Regional feeder connecting Vizag metro (5 stops) with peri-urban centers |
| **9001** | `9001-srungavarapu-kota-visakhapatnam` | Srungavarapu Kota | Visakhapatnam | 48 | 28 | Yes | Vizag Regional | Medium | Regional feeder connecting Vizag metro (19 stops) with peri-urban centers |
| **9004** | `9004-kakinada-vizianagaram` | Vizianagaram | Kakinada | 5 | 16 | Yes | Vizag Regional | Medium | Regional feeder connecting Vizag metro (7 stops) with peri-urban centers |
| **9013** | `9013-parvathipuram-visakhapatnam` | Visakhapatnam | Parvathipuram | 38 | 14 | Yes | Vizag Regional | High | Regional feeder connecting Vizag metro (5 stops) with peri-urban centers |
| **9014** | `9014-palakonda-visakhapatnam` | Visakhapatnam | Palakonda | 81 | 16 | Yes | Vizag Regional | Medium | Regional feeder connecting Vizag metro (7 stops) with peri-urban centers |
| **9016** | `9016-cheepurupalle-visakhapatnam` | Cheepurupalle | Visakhapatnam | 1 | 9 | Yes | Vizag Regional | Medium | Regional feeder connecting Vizag metro (4 stops) with peri-urban centers |
| **9020** | `9020-jaggampet-rjy-srikakulam` | Jaggampet-Rjy | Srikakulam | 2 | 5 | Yes | Vizag Regional | Medium | Regional feeder connecting Vizag metro (2 stops) with peri-urban centers |
| **9021** | `9021-parvathipuram-visakhapatnam` | Visakhapatnam | Parvathipuram | 118 | 24 | Yes | Vizag Regional | Medium | Regional feeder connecting Vizag metro (9 stops) with peri-urban centers |
| **9067** | `9067-guntur-visakhapatnam` | Visakhapatnam | Guntur | 12 | 28 | Yes | Vizag Regional | Medium | Regional feeder connecting Vizag metro (12 stops) with peri-urban centers |
| **9207** | `9207-bobbili-visakhapatnam` | Visakhapatnam | Bobbili | 29 | 18 | Yes | Vizag Regional | Medium | Regional feeder connecting Vizag metro (8 stops) with peri-urban centers |
| **9207** | `9207-bobbili-srungavarapu-kota` | Srungavarapu Kota | Bobbili | 3 | 14 | Yes | Vizag Regional | Medium | Regional feeder connecting Vizag metro (8 stops) with peri-urban centers |
| **9347** | `9347-rajam-visakhapatnam` | Visakhapatnam | Rajam | 65 | 11 | Yes | Vizag Regional | Medium | Regional feeder connecting Vizag metro (5 stops) with peri-urban centers |
| **9420** | `9420-kakinada-visakhapatnam` | Kakinada | Visakhapatnam | 3 | 2 | Yes | Vizag Regional | High | Regional feeder connecting Vizag metro (1 stops) with peri-urban centers |
| **9516** | `9516-paderu-visakhapatnam` | Visakhapatnam | Paderu | 54 | 12 | Yes | Vizag Regional | High | Regional feeder connecting Vizag metro (6 stops) with peri-urban centers |
| **97201** | `neo-97201` | Visakhapatnam | Garikapadu Check Post | 1 | 12 | No | Vizag Regional | Medium | Regional feeder connecting Vizag metro (6 stops) with peri-urban centers |
| **A130** | `a130-kinchumanda-visakhapatnam` | Kinchumanda | Visakhapatnam | 11 | 28 | Yes | Vizag Regional | Medium | Regional feeder connecting Vizag metro (10 stops) with peri-urban centers |
| **AO41** | `ao41-addaroad-nakkapalli-rtc-complex-vsp` | Addaroad Nakkapalli | Rtc Complex Vsp | 4 | 46 | Yes | Vizag Regional | High | Regional feeder connecting Vizag metro (33 stops) with peri-urban centers |
| **B113** | `b113-narsipatnam-visakhapatnam` | Narsipatnam | Visakhapatnam | 130 | 13 | Yes | Vizag Regional | Medium | Regional feeder connecting Vizag metro (8 stops) with peri-urban centers |
| **B1SK** | `b1sk-anandapuram-srungavarapu-kota` | Anandapuram | Srungavarapu Kota | 18 | 8 | Yes | Vizag Regional | Medium | Regional feeder connecting Vizag metro (6 stops) with peri-urban centers |
| **B1SK** | `b1sk-pendurthi-srungavarapu-kota` | Srungavarapu Kota | Pendurthi | 8 | 8 | Yes | Vizag Regional | Medium | Regional feeder connecting Vizag metro (6 stops) with peri-urban centers |
| **B2SK** | `b2sk-musiram-srungavarapu-kota` | Musiram | Srungavarapu Kota | 6 | 7 | Yes | Vizag Regional | Medium | Regional feeder connecting Vizag metro (5 stops) with peri-urban centers |
| **B4SK** | `b4sk-goljam-srungavarapu-kota` | Srungavarapu Kota | Goljam | 6 | 4 | Yes | Vizag Regional | Medium | Regional feeder connecting Vizag metro (2 stops) with peri-urban centers |
| **BC01** | `bc01-bhadrachalam-palasa` | Palasa | Bhadrachalam | 2 | 30 | Yes | Vizag Regional | Medium | Regional feeder connecting Vizag metro (11 stops) with peri-urban centers |
| **BUS2** | `bus2-anakapalli-karaka` | Anakapalli | Karaka | 4 | 6 | Yes | Vizag Regional | Medium | Regional feeder connecting Vizag metro (3 stops) with peri-urban centers |
| **BUS8** | `bus8-anakapalli-mallam` | Anakapalli | Mallam | 4 | 6 | Yes | Vizag Regional | Medium | Regional feeder connecting Vizag metro (3 stops) with peri-urban centers |
| **GA41** | `ga41-dbs-complex-narsipatnam` | Dbs Complex | Narsipatnam | 2 | 12 | Yes | Vizag Regional | Medium | Regional feeder connecting Vizag metro (8 stops) with peri-urban centers |
| **GA42** | `ga42-mvp-colony-narsipatnam` | Narsipatnam | Mvp Colony | 1 | 13 | Yes | Vizag Regional | Medium | Regional feeder connecting Vizag metro (9 stops) with peri-urban centers |
| **GA42** | `ga42-mvp-rythu-bajar-totakurapalem` | Mvp Rythu Bajar | Totakurapalem | 1 | 17 | Yes | Vizag Regional | Medium | Regional feeder connecting Vizag metro (13 stops) with peri-urban centers |
| **GNT1** | `gnt1-srikakulam-vijayawada` | Srikakulam | Vijayawada | 10 | 56 | Yes | Vizag Regional | Medium | Regional feeder connecting Vizag metro (24 stops) with peri-urban centers |
| **GO01** | `go01-gantyada-hb-colony-gwk-depot` | Gwk Depot | Gantyada Hb Colony | 5 | 4 | Yes | Vizag Regional | High | Regional feeder connecting Vizag metro (3 stops) with peri-urban centers |
| **JP01** | `jp01-jolaput-madhurawada-depot` | Madhurawada Depot | Jolaput | 2 | 20 | Yes | Vizag Regional | High | Regional feeder connecting Vizag metro (7 stops) with peri-urban centers |
| **KK02** | `kk02-kakinada-srikakulam` | Srikakulam | Kakinada | 4 | 13 | Yes | Vizag Regional | Medium | Regional feeder connecting Vizag metro (5 stops) with peri-urban centers |
| **KPT1** | `kpt1-anakapalli-kothapatnam` | Anakapalli | Kothapatnam | 13 | 9 | Yes | Vizag Regional | Medium | Regional feeder connecting Vizag metro (5 stops) with peri-urban centers |
| **KR01** | `kr01-kurnool-madhurawada-depot` | Madhurawada Depot | Kurnool | 2 | 43 | Yes | Vizag Regional | Medium | Regional feeder connecting Vizag metro (18 stops) with peri-urban centers |
| **KV01** | `kv01-chodavaram-konam` | Konam | Chodavaram | 3 | 8 | Yes | Vizag Regional | Medium | Regional feeder connecting Vizag metro (3 stops) with peri-urban centers |
| **KV01** | `kv01-chodavaram-manchala` | Chodavaram | Manchala | 2 | 5 | Yes | Vizag Regional | Medium | Regional feeder connecting Vizag metro (3 stops) with peri-urban centers |
| **KV01** | `kv01-anakapalli-manchala` | Manchala | Anakapalli | 2 | 9 | Yes | Vizag Regional | Medium | Regional feeder connecting Vizag metro (7 stops) with peri-urban centers |
| **KV01** | `kv01-anakapalli-konam` | Anakapalli | Konam | 1 | 9 | Yes | Vizag Regional | Medium | Regional feeder connecting Vizag metro (5 stops) with peri-urban centers |
| **KVP1** | `kvp1-upparapalli-visakhapatnam` | Upparapalli | Visakhapatnam | 3 | 20 | Yes | Vizag Regional | Medium | Regional feeder connecting Vizag metro (12 stops) with peri-urban centers |
| **KVP2** | `kvp2-venkatapuram-visakhapatnam` | Venkatapuram | Visakhapatnam | 3 | 19 | Yes | Vizag Regional | Medium | Regional feeder connecting Vizag metro (12 stops) with peri-urban centers |
| **MD01** | `md01-anakapalli-madugula` | Anakapalli | Madugula | 18 | 8 | Yes | Vizag Regional | Medium | Regional feeder connecting Vizag metro (5 stops) with peri-urban centers |
| **N119** | `n119-srikakulam1-visakhapatnam` | Visakhapatnam | Srikakulam1 | 234 | 25 | Yes | Vizag Regional | Medium | Regional feeder connecting Vizag metro (12 stops) with peri-urban centers |
| **NRP8** | `nrp8-anakapalli-narsipatnam` | Anakapalli | Narsipatnam | 91 | 10 | Yes | Vizag Regional | Medium | Regional feeder connecting Vizag metro (4 stops) with peri-urban centers |
| **PLS4** | `pls4-anakapalli-palasa` | Palasa | Anakapalli | 2 | 16 | Yes | Vizag Regional | High | Regional feeder connecting Vizag metro (9 stops) with peri-urban centers |
| **PRL2** | `prl2-anakapalli-parlakimidi` | Anakapalli | Parlakimidi | 2 | 18 | Yes | Vizag Regional | Medium | Regional feeder connecting Vizag metro (9 stops) with peri-urban centers |
| **RJ11** | `rj11-rajamahendravaram-srikakulam` | Srikakulam | Rajamahendravaram | 2 | 11 | Yes | Vizag Regional | Medium | Regional feeder connecting Vizag metro (6 stops) with peri-urban centers |
| **RJ12** | `rj12-rajamahendravaram-vsp-maddilapalem-city-bus-station` | Vsp Maddilapalem City Bus Station | Rajamahendravaram | 2 | 17 | Yes | Vizag Regional | Medium | Regional feeder connecting Vizag metro (10 stops) with peri-urban centers |
| **RZL1** | `rzl1-razolu-vizianagaram` | Vizianagaram | Razolu | 2 | 20 | Yes | Vizag Regional | Medium | Regional feeder connecting Vizag metro (7 stops) with peri-urban centers |
| **S056** | `s056-simhachalam-vizianagaram` | Simhachalam | Vizianagaram | 3 | 10 | Yes | Vizag Regional | Medium | Regional feeder connecting Vizag metro (7 stops) with peri-urban centers |
| **SK10** | `sk10-srikakulam-visakhapatnam` | Visakhapatnam | Srikakulam | 51 | 16 | Yes | Vizag Regional | Medium | Regional feeder connecting Vizag metro (8 stops) with peri-urban centers |
| **SPT3** | `spt3-anakapalli-ravikamatam` | Anakapalli | Ravikamatam | 1 | 8 | Yes | Vizag Regional | Medium | Regional feeder connecting Vizag metro (3 stops) with peri-urban centers |
| **SSM1** | `ssm1-madhurawada-depot-srisailam` | Madhurawada Depot | Srisailam | 2 | 34 | Yes | Vizag Regional | Medium | Regional feeder connecting Vizag metro (15 stops) with peri-urban centers |
| **TUN7** | `tun7-eti-koppaka-visakhapatnam` | Eti Koppaka | Visakhapatnam | 2 | 20 | Yes | Vizag Regional | Medium | Regional feeder connecting Vizag metro (12 stops) with peri-urban centers |
| **TUN7** | `tun7-payakaraopeta-visakhapatnam` | Payakaraopeta | Visakhapatnam | 1 | 23 | Yes | Vizag Regional | Medium | Regional feeder connecting Vizag metro (12 stops) with peri-urban centers |
| **V011** | `v011-narsapuram-vsp-maddilapalem-city-bus-station` | Narsapuram | Vsp Maddilapalem City Bus Station | 6 | 25 | Yes | Vizag Regional | Medium | Regional feeder connecting Vizag metro (10 stops) with peri-urban centers |
| **V013** | `v013-palasa-visakhapatnam` | Visakhapatnam | Palasa | 24 | 25 | Yes | Vizag Regional | High | Regional feeder connecting Vizag metro (9 stops) with peri-urban centers |
| **V025** | `v025-kakinada-vsp-maddilapalem-city-bus-station` | Vsp Maddilapalem City Bus Station | Kakinada | 52 | 16 | Yes | Vizag Regional | Medium | Regional feeder connecting Vizag metro (8 stops) with peri-urban centers |
| **V125** | `v125-kandukur-visakhapatnam` | Visakhapatnam | Kandukur | 2 | 22 | Yes | Vizag Regional | Medium | Regional feeder connecting Vizag metro (8 stops) with peri-urban centers |
| **VIZ3** | `viz3-nellore-waltair-depot` | Waltair Depot | Nellore | 1 | 19 | Yes | Vizag Regional | Medium | Regional feeder connecting Vizag metro (8 stops) with peri-urban centers |
| **VJ01** | `vj01-madhurawada-depot-vijayawada` | Madhurawada Depot | Vijayawada | 8 | 41 | Yes | Vizag Regional | Medium | Regional feeder connecting Vizag metro (23 stops) with peri-urban centers |
| **VJ01** | `vj01-tekkali-vijayawada` | Tekkali | Vijayawada | 2 | 51 | Yes | Vizag Regional | Medium | Regional feeder connecting Vizag metro (21 stops) with peri-urban centers |
| **VJ05** | `vj05-palasa-vijayawada` | Palasa | Vijayawada | 8 | 50 | Yes | Vizag Regional | Medium | Regional feeder connecting Vizag metro (21 stops) with peri-urban centers |
| **VR02** | `vr02-rtc-complex-vsp-vizianagaram` | Rtc Complex Vsp | Vizianagaram | 36 | 12 | Yes | Vizag Regional | Medium | Regional feeder connecting Vizag metro (9 stops) with peri-urban centers |
| **VS02** | `vs02-mvp-city-complex-vijayawada` | Vijayawada | Mvp City Complex | 22 | 42 | Yes | Vizag Regional | Medium | Regional feeder connecting Vizag metro (17 stops) with peri-urban centers |
| **VS11** | `vs11-salur-visakhapatnam` | Visakhapatnam | Salur | 84 | 20 | Yes | Vizag Regional | High | Regional feeder connecting Vizag metro (8 stops) with peri-urban centers |
| **VS12** | `vs12-bhimavaram-old-bus-stand-mvp-city-complex` | Bhimavaram Old Bus Stand | Mvp City Complex | 2 | 31 | Yes | Vizag Regional | Medium | Regional feeder connecting Vizag metro (11 stops) with peri-urban centers |
| **VS12** | `vs12-bhimavaram-mvp-city-complex` | Mvp City Complex | Bhimavaram | 2 | 23 | Yes | Vizag Regional | Medium | Regional feeder connecting Vizag metro (9 stops) with peri-urban centers |
| **VSP1** | `vsp1-bapatla-vizianagaram` | Vizianagaram | Bapatla | 2 | 31 | Yes | Vizag Regional | Medium | Regional feeder connecting Vizag metro (11 stops) with peri-urban centers |
| **VSP2** | `vsp2-mvp-city-complex-tenali` | Mvp City Complex | Tenali | 3 | 17 | Yes | Vizag Regional | Medium | Regional feeder connecting Vizag metro (8 stops) with peri-urban centers |
| **VSP3** | `vsp3-kurnool-visakhapatnam` | Visakhapatnam | Kurnool | 2 | 29 | Yes | Vizag Regional | Medium | Regional feeder connecting Vizag metro (12 stops) with peri-urban centers |
| **VSP4** | `vsp4-jangareddy-gudem-visakhapatnam` | Jangareddy Gudem | Visakhapatnam | 4 | 23 | Yes | Vizag Regional | Medium | Regional feeder connecting Vizag metro (10 stops) with peri-urban centers |
| **Y081** | `y081-bhimavaram-madhurawada-depot` | Madhurawada Depot | Bhimavaram | 4 | 31 | Yes | Vizag Regional | Medium | Regional feeder connecting Vizag metro (18 stops) with peri-urban centers |

## 4. Audit Table: Key Intercity Routes Serving Visakhapatnam (Sample)

| Route No | Route ID | Origin | Destination | Trips | Stops | Geometry | Classification | Conf. | Classification Reason |
|---|---|---|---|---|---|---|---|---|---|
| **02663** | `neo-02663` | Kakinada | Vsp Maddilapalem City Bus Station | 1 | 7 | No | Intercity | High | Long-distance intercity corridor with 2/7 stop(s) in Vizag |
| **02695** | `neo-02695` | Kakinada | Vsp Maddilapalem City Bus Station | 1 | 7 | No | Intercity | High | Long-distance intercity corridor with 2/7 stop(s) in Vizag |
| **02765** | `neo-02765` | Kakinada | Pathapatnam | 1 | 21 | No | Intercity | High | Long-distance intercity corridor with 4/21 stop(s) in Vizag |
| **02766** | `neo-02766` | Pathapatnam | Kakinada | 1 | 21 | No | Intercity | High | Long-distance intercity corridor with 7/21 stop(s) in Vizag |
| **02767** | `neo-02767` | Kakinada | Pathapatnam | 1 | 21 | No | Intercity | High | Long-distance intercity corridor with 4/21 stop(s) in Vizag |
| **02768** | `neo-02768` | Pathapatnam | Kakinada | 1 | 18 | No | Intercity | High | Long-distance intercity corridor with 4/18 stop(s) in Vizag |
| **02805** | `neo-02805` | Kovvuru | Ichapuram | 1 | 27 | No | Intercity | High | Long-distance intercity corridor with 4/27 stop(s) in Vizag |
| **02806** | `neo-02806` | Ichapuram | Kovvuru | 1 | 22 | No | Intercity | High | Long-distance intercity corridor with 4/22 stop(s) in Vizag |
| **02807** | `neo-02807` | Rajamahendravaram | Ichapuram | 1 | 26 | No | Intercity | High | Long-distance intercity corridor with 4/26 stop(s) in Vizag |
| **02808** | `neo-02808` | Ichapuram | Rajamahendravaram | 1 | 21 | No | Intercity | High | Long-distance intercity corridor with 4/21 stop(s) in Vizag |
| **02855** | `neo-02855` | Ramachandrapuram | Ichapuram | 1 | 27 | No | Intercity | High | Long-distance intercity corridor with 4/27 stop(s) in Vizag |
| **02856** | `neo-02856` | Ichapuram | Ramachandrapuram | 1 | 21 | No | Intercity | High | Long-distance intercity corridor with 4/21 stop(s) in Vizag |
| **02857** | `neo-02857` | Ramachandrapuram | Ichapuram | 1 | 28 | No | Intercity | High | Long-distance intercity corridor with 4/28 stop(s) in Vizag |
| **02858** | `neo-02858` | Ichapuram | Ramachandrapuram | 1 | 24 | No | Intercity | High | Long-distance intercity corridor with 4/24 stop(s) in Vizag |
| **02925** | `neo-02925` | Vijayawada | Srikakulam | 1 | 25 | No | Intercity | High | Long-distance intercity corridor with 4/25 stop(s) in Vizag |
| **03048** | `neo-03048` | Palasa | Vijayawada | 1 | 29 | No | Intercity | High | Long-distance intercity corridor with 9/29 stop(s) in Vizag |
| **03079** | `neo-03079` | Palasa | Vijayawada | 1 | 29 | No | Intercity | High | Long-distance intercity corridor with 9/29 stop(s) in Vizag |
| **03084** | `neo-03084` | Tekkali | Rajamahendravaram | 1 | 21 | No | Intercity | High | Long-distance intercity corridor with 5/21 stop(s) in Vizag |
| **03092** | `neo-03092` | Tekkali | Rajamahendravaram | 1 | 21 | No | Intercity | High | Long-distance intercity corridor with 5/21 stop(s) in Vizag |
| **03094** | `neo-03094` | Tekkali | Rajamahendravaram | 1 | 21 | No | Intercity | High | Long-distance intercity corridor with 5/21 stop(s) in Vizag |
| **03096** | `neo-03096` | Tekkali | Amalapuram | 1 | 23 | No | Intercity | High | Long-distance intercity corridor with 5/23 stop(s) in Vizag |
| **03103** | `neo-03103` | Tekkali | Amalapuram | 1 | 23 | No | Intercity | High | Long-distance intercity corridor with 5/23 stop(s) in Vizag |
| **03107** | `neo-03107` | Tekkali | Rajamahendravaram | 1 | 21 | No | Intercity | High | Long-distance intercity corridor with 5/21 stop(s) in Vizag |
| **03148** | `neo-03148` | Vizianagaram | Vijayawada | 1 | 20 | No | Intercity | High | Long-distance intercity corridor with 6/20 stop(s) in Vizag |
| **03235** | `neo-03235` | Ravulapalem | Salur | 1 | 19 | No | Intercity | High | Long-distance intercity corridor with 5/19 stop(s) in Vizag |
| **03334** | `neo-03334` | Kakinada | Vsp Maddilapalem City Bus Station | 1 | 11 | No | Intercity | High | Long-distance intercity corridor with 3/11 stop(s) in Vizag |
| **03340** | `neo-03340` | Kakinada | Vsp Maddilapalem City Bus Station | 1 | 10 | No | Intercity | High | Long-distance intercity corridor with 3/10 stop(s) in Vizag |
| **03424** | `neo-03424` | Bhimavaram | Madhurawada | 1 | 15 | No | Intercity | High | Long-distance intercity corridor with 4/15 stop(s) in Vizag |
| **03712** | `neo-03712` | Machilipatnam | Vsp Maddilapalem City Bus Station | 1 | 24 | No | Intercity | High | Long-distance intercity corridor with 4/24 stop(s) in Vizag |
| **04905** | `neo-04905` | Narsapuram | Mvp City Complex | 1 | 18 | No | Intercity | High | Long-distance intercity corridor with 4/18 stop(s) in Vizag |
| **04911** | `neo-04911` | Narsapuram | Mvp City Complex | 1 | 18 | No | Intercity | High | Long-distance intercity corridor with 4/18 stop(s) in Vizag |
| **05047** | `neo-05047` | Nellore | Visakhapatnam | 1 | 19 | No | Intercity | High | Long-distance intercity corridor with 3/19 stop(s) in Vizag |
| **05208** | `neo-05208` | Udayagiri | Visakhapatnam | 1 | 23 | No | Intercity | High | Long-distance intercity corridor with 6/23 stop(s) in Vizag |
| **05865** | `neo-05865` | Visakhapatnam | Kandukur | 1 | 19 | No | Intercity | High | Long-distance intercity corridor with 6/19 stop(s) in Vizag |
| **08304** | `neo-08304` | Bhimavaram | Vizianagaram | 1 | 19 | No | Intercity | High | Long-distance intercity corridor with 4/19 stop(s) in Vizag |
| **08353** | `neo-08353` | Vijayawada | Vizianagaram | 1 | 20 | No | Intercity | High | Long-distance intercity corridor with 5/20 stop(s) in Vizag |
| **09330** | `neo-09330` | Vijayawada | Visakhapatnam | 1 | 34 | No | Intercity | High | Long-distance intercity corridor with 10/34 stop(s) in Vizag |
| **24025** | `neo-24025` | Rajamahendravaram | Ichapuram | 1 | 27 | No | Intercity | High | Long-distance intercity corridor with 5/27 stop(s) in Vizag |
| **24026** | `neo-24026` | Ichapuram | Rajamahendravaram | 1 | 21 | No | Intercity | High | Long-distance intercity corridor with 4/21 stop(s) in Vizag |
| **24281** | `neo-24281` | Razolu | Ichapuram | 1 | 32 | No | Intercity | High | Long-distance intercity corridor with 6/32 stop(s) in Vizag |
| **24282** | `neo-24282` | Ichapuram | Razolu | 1 | 26 | No | Intercity | High | Long-distance intercity corridor with 5/26 stop(s) in Vizag |
| **27018** | `neo-27018` | Visakhapatnam | Onukudelli | 1 | 22 | No | Intercity | High | Long-distance intercity corridor with 5/22 stop(s) in Vizag |
| **27019** | `neo-27019` | Onukudelli | Visakhapatnam | 1 | 22 | No | Intercity | High | Long-distance intercity corridor with 5/22 stop(s) in Vizag |
| **27034** | `neo-27034` | Visakhapatnam | Parlakimidi | 1 | 17 | No | Intercity | High | Long-distance intercity corridor with 5/17 stop(s) in Vizag |
| **27035** | `neo-27035` | Parlakimidi | Visakhapatnam | 1 | 17 | No | Intercity | High | Long-distance intercity corridor with 5/17 stop(s) in Vizag |
| **27038** | `neo-27038` | Visakhapatnam | Parlakimidi | 1 | 17 | No | Intercity | High | Long-distance intercity corridor with 5/17 stop(s) in Vizag |
| **27039** | `neo-27039` | Parlakimidi | Visakhapatnam | 1 | 17 | No | Intercity | High | Long-distance intercity corridor with 5/17 stop(s) in Vizag |
| **27184** | `neo-27184` | Visakhapatnam | Gunupur | 1 | 20 | No | Intercity | High | Long-distance intercity corridor with 5/20 stop(s) in Vizag |
| **27185** | `neo-27185` | Gunupur | Visakhapatnam | 1 | 20 | No | Intercity | High | Long-distance intercity corridor with 5/20 stop(s) in Vizag |
| **27208** | `neo-27208` | Ichapuram | Visakhapatnam | 1 | 12 | No | Intercity | High | Long-distance intercity corridor with 4/12 stop(s) in Vizag |