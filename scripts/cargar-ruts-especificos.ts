import { query } from '../src/lib/database';
import { v4 as uuidv4 } from 'uuid';
import { getTenantId } from '@/lib/utils/tenant-utils';

// RUTs específicos a cargar
const rutsEspecificos = [
  '12833245-6', '21381703-5', '9178825-K', '13211292-4', '18563612-7',
  '17548578-3', '16866346-3', '20721061-7', '11207494-5', '10122151-2',
  '19707020-k', '13596911-7', '11614357-7', '10826281-8', '13871754-2',
  '15071621-7', '19104063-5', '8332329-9', '16924218-6', '9146689-9',
  '20131346-5', '20904805-1', '25978430-1', '17689964-6', '10396288-9',
  '13566525-8', '24378420-4', '20382235-9', '20432415-8', '19284975-6',
  '9061144-5', '17122247-8', '16032595-K', '10150927-3', '16304718-7',
  '9166943-9', '19683046-4', '9350807-6', '13281478-3', '16696412-1',
  '16412103-8', '16519729-1', '25933812-3', '19448798-3', '21194404-8',
  '17462903-K', '20453936-7', '16744067-3', '9920483-4', '25629118-5',
  '10165663-2', '19887162-1', '15976054-5', '19139275-2', '17614310-K',
  '16147407-k', '10198125-8', '13344687-7', '16563350-4', '17414800-7',
  '13173493-k', '17564802-K', '16755015-0', '13401103-3', '16441461-2',
  '9991272-3', '17902401-2', '26952355-7', '20216227-4', '18883244-K',
  '19222820-4', '16953359-8', '12864761-9', '13479418-6', '13980816',
  '21112460-1', '12003583-5', '19787268-3', '17689223-4', '20228775-1',
  '13283511-K', '15184055-8', '20122675-9', '18830186-K'
];

// Datos de coordenadas por dirección
const coordenadasPorDireccion: Record<string, { latitud: number; longitud: number }> = {
  'Dieciocho 25 dpto 55': { latitud: -33.4464185, longitud: -70.65857423 },
  'Illapel 4781': { latitud: -31.62592914, longitud: -71.16390009 },
  'Bascuñán Guerrero 1845': { latitud: -33.47097689, longitud: -70.67153399 },
  'Río imperial 8960': { latitud: -33.55277403, longitud: -70.61365609 },
  'Avenida Rodrigo de Araya 4507': { latitud: -33.47412769, longitud: -70.58518271 },
  'Pasaje Los Misioneros 2972': { latitud: -33.58234381, longitud: -70.56297971 },
  'Parcela el Rosal S/N': { latitud: -33.57425, longitud: -70.63129 },
  'Pasaje Salar Grande #3878': { latitud: -33.57501882, longitud: -70.60533766 },
  'Perez Rosales 832': { latitud: -33.44508721, longitud: -70.55194002 },
  'Decima avenida 1430': { latitud: -33.51164379, longitud: -70.66481724 },
  'LAGO LANALHUE 2316 DEPTO. 54 VILLA PORVENIR': { latitud: -33.4306377, longitud: -70.7274788 },
  'Salvador san fuente 2150': { latitud: -33.4494362, longitud: -70.66536743 },
  'Calle plaza 8146': { latitud: -33.5275557, longitud: -70.66543406 },
  'Pasaje paranal 158': { latitud: -33.47907916, longitud: -70.55900051 },
  'Bernardo OHiggins 315': { latitud: -33.43984232, longitud: -70.64059237 },
  'GENERAL BULNES82 CASA 4': { latitud: -33.4445643, longitud: -70.66947112 },
  'Los pimientos  8043': { latitud: -33.44221842, longitud: -70.73696514 },
  'Julio montt 537': { latitud: -33.35350031, longitud: -70.71982223 },
  'Gratitud 1195': { latitud: -33.52577697, longitud: -70.7739453 },
  'carlos toribio robinet #1362': { latitud: -33.41127318, longitud: -70.67273068 },
  'Calamar 308': { latitud: -33.45532299, longitud: -70.53385898 },
  'Las codornices 2929': { latitud: -33.50450279, longitud: -70.6032872 },
  'Los Valles 4698': { latitud: -33.47378781, longitud: -70.71924831 },
  'Calle internacional  número 56': { latitud: -33.63288865, longitud: -70.61647647 },
  'Pasaje Cuatro 5151': { latitud: -33.49670821, longitud: -70.58772812 },
  'Las Hulaltatas 9351': { latitud: -33.38520718, longitud: -70.54451958 },
  'Av. circunvalacion oriente 471': { latitud: -33.38050048, longitud: -70.72884432 },
  'Camino Refugios del Arrayan 16982': { latitud: -33.3523026, longitud: -70.47864766 },
  'Colo Colo 1935': { latitud: -33.59326156, longitud: -70.66002081 },
  'La conquista jaime lea plaza #180': { latitud: -33.52553131, longitud: -70.7727329 },
  'Vicuña mackenna #0918': { latitud: -33.54429511, longitud: -70.65551567 },
  'Curimon 8042': { latitud: -33.52749322, longitud: -70.57722576 },
  'San petersburgo 6351 dpto 1407A': { latitud: -33.51244038, longitud: -70.64645629 },
  'Las frambuesas 0841': { latitud: -33.62401222, longitud: -70.58582853 },
  'Av. Ventisqueros 1561 B /C dep 302': { latitud: -33.40731728, longitud: -70.76690209 },
  'Los cheyenes 1827': { latitud: -33.47251422, longitud: -70.56610248 },
  'francisco coloane 308 villa los jardines': { latitud: -33.61292785, longitud: -70.7100681 },
  'Calle socos 9224': { latitud: -33.54825, longitud: -70.61598477 },
  'LORD COCHRANE 1007 DPTO 903': { latitud: -33.45855789, longitud: -70.65311392 },
  'Carlos Antunez 1831 dpto 210': { latitud: -33.42697668, longitud: -70.6144275 },
  'Las Verbenas 8055': { latitud: -33.39858674, longitud: -70.55275231 },
  'El olimpo 2731': { latitud: -33.50309488, longitud: -70.77548493 },
  'Freirina 1832': { latitud: -33.41029812, longitud: -70.6646387 },
  'Mallorca 961': { latitud: -33.57662609, longitud: -70.67572821 },
  'Antonio Borquez Solar 9733': { latitud: -33.54652181, longitud: -70.68355224 },
  'Riquelme 323': { latitud: -33.54707049, longitud: -70.66292697 },
  'Pasaje Moraleda 5668': { latitud: -33.37365529, longitud: -70.67245299 },
  'PASAJE NICANOR PLAZA 151': { latitud: -33.4640218, longitud: -70.62908208 },
  'Chacabuco 1021': { latitud: -33.43346109, longitud: -70.67922992 },
  'Las quilas km 1.4 pueblo seco': { latitud: -33.42036, longitud: -70.72528 },
  'Av José Joaquín prieto 10914': { latitud: -33.55664886, longitud: -70.69155783 },
  'Santa Mónica 2239': { latitud: -33.44401608, longitud: -70.66618902 },
  'Estacion el melocoton 0885': { latitud: -33.62745542, longitud: -70.61705573 },
  'Pto príncipe 1479': { latitud: -33.54193721, longitud: -70.57130512 },
  'Lastarria 1188': { latitud: -33.36756761, longitud: -70.63958229 },
  'Santa Petronila 28 depto #2515': { latitud: -33.45461891, longitud: -70.70451682 },
  'Pasaje7 #5424': { latitud: -33.50355639, longitud: -70.56494326 },
  'Exequiel 038': { latitud: -33.51476456, longitud: -70.74419046 },
  'Los canarios': { latitud: -33.56180162, longitud: -70.65559863 },
  'Vecinal sur 1962': { latitud: -33.58168721, longitud: -70.66328587 },
  'Rupanco 5642': { latitud: -33.37359691, longitud: -70.67352738 },
  'Colo colo 1340': { latitud: -33.43535582, longitud: -70.70401219 },
  'Avenida Manuel Rodríguez 22': { latitud: -33.44517761, longitud: -70.66112459 },
  'Julio Rivas 64': { latitud: -33.60165672, longitud: -70.69723873 },
  'pasaje valle hondo 1729': { latitud: -33.49917001, longitud: -70.7365173 },
  'Alfredo Lobos 2766': { latitud: -33.401002, longitud: -70.65013131 },
  'Av españa 474': { latitud: -33.45464161, longitud: -70.66877434 },
  'Huérfanos 547': { latitud: -33.43861671, longitud: -70.64478994 },
  'Pedro de Valdivia 7057': { latitud: -33.48906911, longitud: -70.6067273 },
  'Hermanos amunategui 890': { latitud: -33.43343577, longitud: -70.65754793 },
  'Ñielol poniente 2769': { latitud: -33.4809386, longitud: -70.61093062 },
  'Villa quiñenco Melin 4820': { latitud: -33.4459946, longitud: -70.6670569 },
  'Rosas 3015': { latitud: -33.43678891, longitud: -70.67643188 },
  'Psj liszt 158': { latitud: -33.3612704, longitud: -70.73443733 },
  'España casa 3': { latitud: -33.44875294, longitud: -70.67034487 },
  'Santo Domingo 3251': { latitud: -33.4379149, longitud: -70.67882189 },
  'los Alerces 2660': { latitud: -33.57155433, longitud: -70.66827482 },
  'Sanará Elena 2120': { latitud: -33.40637232, longitud: -70.73104611 },
  'pasaje dos casa 2337': { latitud: -33.41414189, longitud: -70.71232637 },
  'juaquin warkel martines 2428': { latitud: -33.42107611, longitud: -70.69106458 },
  'Almirante castillo 725': { latitud: -33.43052253, longitud: -70.66669296 },
  'HUECHURABA 1254': { latitud: -33.37250488, longitud: -70.66942289 },
  'Radal 066 torre A Dpto 2403': { latitud: -33.45543509, longitud: -70.70148723 },
  'Magdalena Mira 489': { latitud: -33.42316623, longitud: -70.55093265 },
  'Pje ch  4764': { latitud: -33.43933391, longitud: -70.70242349 },
  'AVENIDA CARLOS DITTBORN 0410 DPTO 105 BLOCK 54': { latitud: -33.46625419, longitud: -70.62176058 },
  'Calle austral 4933 primer sector gomez carreño': { latitud: -33.4459946, longitud: -70.6670569 },
  'El meli 997': { latitud: -33.5879505, longitud: -70.59319731 },
  'LAS CAÑAS 1451': { latitud: -33.41119129, longitud: -70.67399609 },
  'Ayacucho 461': { latitud: -33.4373228, longitud: -70.64628209 },
  'Parcela 24 camino pelvin': { latitud: -33.4703818, longitud: -70.66827599 },
  'Entre rios#1721': { latitud: -33.42801109, longitud: -70.69896721 },
  'Las violetas 515 dep-12-A': { latitud: -33.36730348, longitud: -70.7502492 },
  'Padre Alonso Ovalle 840 depto 105': { latitud: -33.44560349, longitud: -70.64735007 },
  'Calle riquelme 1074': { latitud: -33.59779418, longitud: -70.67991415 },
  'Camino San Alberto Hurtado 3812': { latitud: -33.55976099, longitud: -70.80223762 },
  'MANUEL PLAZA 4807': { latitud: -33.47408872, longitud: -70.71745249 },
  'Pasaje Los Robles  11293': { latitud: -33.56638181, longitud: -70.66819146 },
  'Las condes 1226': { latitud: -33.4144312, longitud: -70.5570261 },
  'San Pedro 941': { latitud: -33.55639641, longitud: -70.57482913 },
  'AV Francia #1157': { latitud: -33.41065699, longitud: -70.6554886 },
  'Pasaje Juan ferra # 7435': { latitud: -33.38582291, longitud: -70.63967499 },
  'Mar de behring 2470': { latitud: -33.39722671, longitud: -70.68093799 },
  'Volcan Calbuco 5831': { latitud: -33.51274199, longitud: -70.56756973 },
  'Estrella polar 0361 depto 106': { latitud: -33.62163871, longitud: -70.60734697 },
  'Camilo henriquez 4030': { latitud: -33.56068505, longitud: -70.55756258 },
  'Tacna 3': { latitud: -33.5752394, longitud: -70.66937221 },
  'FUERTE BULNES 3455': { latitud: -33.3940714, longitud: -70.65820938 },
  'Domingo Santa Cruz NO 0634': { latitud: -33.58400409, longitud: -70.66132718 },
  'Antonio Rendic 5859': { latitud: -33.6194144, longitud: -70.6084387 },
  'Juncal 1752': { latitud: -33.3829944, longitud: -70.68034824 },
  'Berlín 843': { latitud: -33.4944142, longitud: -70.64796458 },
  'Calle Camilo Henríquez 0510': { latitud: -33.53778666, longitud: -70.59907691 },
  'Ernesto riquelme 1575 - A': { latitud: -33.59908493, longitud: -70.67393705 },
  'INGLATERRA 1140': { latitud: -33.41263189, longitud: -70.65581239 },
  'Luche 7212': { latitud: -33.51921542, longitud: -70.577295 },
  'San marcos 535': { latitud: -33.3616532, longitud: -70.51039911 },
  'Calle el acero 10560': { latitud: -33.55338831, longitud: -70.57278973 },
  'Avenida general Óscar Bonilla 5877': { latitud: -33.45733891, longitud: -70.71324293 },
  'Los álamos 646 depto 401': { latitud: -33.35848869, longitud: -70.75497626 },
  'Atacama alto # 235': { latitud: -28.57369225, longitud: -70.75839972 },
  'Chao 5972': { latitud: -33.4459946, longitud: -70.6670569 },
  'Baquedano1401': { latitud: -33.43227791, longitud: -70.666355 },
  'Pasaje cerro del cobre 687': { latitud: -33.89994, longitud: -70.24992 },
  'Villa el Carmen 1641': { latitud: -33.46670778, longitud: -70.63702193 },
  'Llallin blok 1869 departamento B12 villa padre hurtado': { latitud: -33.59295961, longitud: -70.60279912 },
  'calle ulkantun block 411 dtpo 21 alto los rosales': { latitud: -33.51140788, longitud: -70.72990041 },
  'Paulina 2148': { latitud: -33.5585432, longitud: -70.55995361 },
  'San ignacio 824': { latitud: -33.33244966, longitud: -70.70930721 },
  'Federico errazuris 1245': { latitud: -33.43250262, longitud: -70.7623354 },
  'Los datiles 1182': { latitud: -33.36634982, longitud: -70.66733686 },
  'Trebulco 2800': { latitud: -33.68333, longitud: -70.95 },
  'PASAJE TAL TAL 6874': { latitud: -33.52412512, longitud: -70.63143539 },
  'Pasaje las quilas 9059': { latitud: -33.42731489, longitud: -70.7616537 },
  'flor de la peña 1306': { latitud: -33.4710388, longitud: -70.53340187 },
  'Alfonso Meléndez 3850': { latitud: -33.72824, longitud: -70.31732 },
  'Pasaje el olivo 13955': { latitud: -33.59316212, longitud: -70.61494064 },
  'avenida santa rosa 1865': { latitud: -33.47005642, longitud: -70.64228598 },
  'Rapel 531': { latitud: -33.56841649, longitud: -70.79138929 },
  'Pasaje Gala 10859': { latitud: -33.55944382, longitud: -70.65147182 },
  'Rector Eugenio Gonzales': { latitud: -33.4718547, longitud: -70.67035 },
  'Buena Vista 2270': { latitud: -33.34044286, longitud: -70.54987991 },
  'Trovador 9041f': { latitud: -33.44291186, longitud: -70.76095917 },
  'Maria Luisa bombal': { latitud: -33.3882, longitud: -70.58 },
  'Los guindos 1971': { latitud: -33.39901708, longitud: -70.71000626 },
  'Luis matte Larraín 871': { latitud: -33.41104122, longitud: -70.5327705 },
  'Lo Martinez 44': { latitud: -33.56764702, longitud: -70.68448336 },
  'Zenteno 257': { latitud: -33.42262687, longitud: -70.61436476 },
  'San enrique block 115 dpto 11': { latitud: -33.36326739, longitud: -70.74357201 },
  'Pasaje filipo 4338': { latitud: -33.5527688, longitud: -70.79641337 },
  'Osorno 367': { latitud: -33.44264122, longitud: -70.70747629 },
  'Calle padre hurtado 198': { latitud: -33.4642381, longitud: -70.69825382 },
  'Talinay 9074': { latitud: -33.4585806, longitud: -70.53796024 },
  'Monseñor escriba de balaguer 12840': { latitud: -33.3712726, longitud: -70.51852973 },
  'Manuel caballero 2205 villa el señorial': { latitud: -33.4459946, longitud: -70.6670569 },
  'Chacabuco 1120 dpto 2002': { latitud: -33.41076491, longitud: -70.6973552 },
  'Chimiles 6998': { latitud: -33.47585722, longitud: -70.56166216 },
  'Calle Valdivia 3285': { latitud: -33.45245697, longitud: -70.6050197 },
  'Erasmo carrasco  3505': { latitud: -33.39393215, longitud: -70.6266353 },
  'Estacion malalcahuello': { latitud: -33.6214017, longitud: -70.61617258 },
  'Lenka franulic': { latitud: -33.5602446, longitud: -70.67370776 },
  'Pasaje el trauco 2116': { latitud: -33.48133802, longitud: -70.52463301 },
  'Los Talaveras 300 Depto. B304': { latitud: -33.45819697, longitud: -70.59103594 },
  'José Joaquín Prieto vial 8340 dep 234': { latitud: -33.52582342, longitud: -70.6777154 },
  'Cuarta transaversal 6295': { latitud: -33.51083792, longitud: -70.66671406 },
  'Blanco encalada 2467': { latitud: -33.457656, longitud: -70.66919326 },
  'Florentino novoa 1100 departamento h_31': { latitud: -33.48145161, longitud: -70.53507526 },
  '4 oriente 8420': { latitud: -33.53981478, longitud: -70.61690419 },
  'Portugal 990 Dpto 1810': { latitud: -33.45468981, longitud: -70.6334426 },
  'Pasaje mira 860i': { latitud: -33.37711365, longitud: -70.50879315 },
  'Forestal 1125': { latitud: -33.43489899, longitud: -70.64290126 },
  'Volcán isluga 649': { latitud: -33.66855599, longitud: -70.74717408 },
  'Sector la cancha s/n': { latitud: -33.3582665, longitud: -70.73183532 },
  'Calle los álamos sin número': { latitud: -33.47247327, longitud: -70.65821487 },
  'San Javier 857 Malloco': { latitud: -33.44172386, longitud: -70.75742029 },
  'ezequiel fernandez 3759': { latitud: -33.48849889, longitud: -70.60208029 },
  'Francisco Zelada 086': { latitud: -33.45560201, longitud: -70.70224051 },
  'Veinte de agosto 623': { latitud: -33.53081966, longitud: -70.69421283 },
  'Pocuro 6233': { latitud: -33.4344989, longitud: -70.5972573 },
  'Cerro la cruz 14600 dpto 13': { latitud: -33.59704003, longitud: -70.67506468 },
  'Los gorriones 1660': { latitud: -33.56257442, longitud: -70.65130083 },
  'manuel castillo 1404': { latitud: -33.43052208, longitud: -70.666881 },
  'PASAJE LIKO CASA 129': { latitud: -33.541683, longitud: -70.6825488 },
  'Cirujano videla N°7': { latitud: -33.61482132, longitud: -70.59039193 },
  'Villa las hortensias pasaje huepil 84': { latitud: -33.5801019, longitud: -70.82913288 },
  'cordillera de la costa #2909': { latitud: -33.59335127, longitud: -70.54210468 },
  'Campamento Juanita cruchaga 5010 5010': { latitud: -33.4459946, longitud: -70.6670569 },
  'Ernesto salinas block 1240': { latitud: -34.12488, longitud: -71.10039 },
  'Socos #9221': { latitud: -33.54822259, longitud: -70.61616323 },
  'Av chile 986': { latitud: -33.503705, longitud: -70.76875306 },
  'Calbuco 1297': { latitud: -33.40656641, longitud: -70.7284792 },
  'Zeus 1177': { latitud: -33.40701652, longitud: -70.74052158 },
  'Cien fuegos 162': { latitud: -33.44213091, longitud: -70.6630049 },
  'Av. Principal #1425': { latitud: -33.3795362, longitud: -70.66769559 },
  'Exequiel Fernández 4195': { latitud: -33.49208621, longitud: -70.60204399 },
  'el tepual 865': { latitud: -33.51482044, longitud: -70.70704382 },
  'Fray juan macias': { latitud: -33.54618646, longitud: -70.76544867 },
  'Los Aymaras 7251': { latitud: -33.41665621, longitud: -70.73573367 },
  'El conquistador 1729': { latitud: -33.5160685, longitud: -70.79676266 },
  'Av san Ignacio 1589': { latitud: -33.58401694, longitud: -70.80901702 },
  'Enrique Molina Garmendia 4883': { latitud: -33.47757919, longitud: -70.5801073 },
  'Meseta norte casa 36 puerto coloso': { latitud: -33.4459946, longitud: -70.6670569 },
  'Villa las lomas pasaje cerro alegre 569': { latitud: -33.60398839, longitud: -70.55541027 },
  'Cerró a antillana 14995': { latitud: -33.59958978, longitud: -70.67280829 },
  'Av cinco de abril 604': { latitud: -33.6074943, longitud: -70.72012739 },
  'Abtao 24': { latitud: -33.45297448, longitud: -70.70037666 },
  'Buenos Aires 511': { latitud: -33.35385618, longitud: -70.7177907 },
  'GENERAL GHANA 9': { latitud: -33.46866304, longitud: -70.62758142 },
  'Anibal pinto': { latitud: -33.41790396, longitud: -70.73527543 },
  'Sargento menadier 655': { latitud: -33.61720779, longitud: -70.58255523 },
  'Felix hoyos 2849': { latitud: -33.4237, longitud: -70.60831 },
  'Salomón Sack 998': { latitud: -33.49403899, longitud: -70.71885914 },
  'PASAJE LADERA 1917': { latitud: -33.47166769, longitud: -70.57367779 },
  'Santa Elena 1486': { latitud: -33.4318, longitud: -70.6467 },
  'Molibdeno 39': { latitud: -33.4459946, longitud: -70.6670569 },
  'Enzo castro 1041': { latitud: -33.52841762, longitud: -70.77093498 }
};

// Función para obtener coordenadas por dirección
function obtenerCoordenadas(direccion: string): { latitud: number | null; longitud: number | null } {
  const coords = coordenadasPorDireccion[direccion];
  return coords ? { latitud: coords.latitud, longitud: coords.longitud } : { latitud: null, longitud: null };
}

// Función para cargar un guardia específico
async function cargarGuardia(rut: string, datos: any) {
  const id = uuidv4();
  const tenantId = await getTenantId(request);
  const coords = obtenerCoordenadas(datos.direccion || '');

  const sqlQuery = `
    INSERT INTO guardias (
      id, tenant_id, rut, apellido_paterno, apellido_materno, nombre, 
      email, telefono, sexo, activo, fecha_contrato, instalacion, 
      jornada, banco, tipo_cuenta, numero_cuenta, anticipo, 
      fecha_nacimiento, direccion, comuna, ciudad, nacionalidad, 
      fecha_os10, created_at, usuario_id, updated_at, latitud, longitud
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, 
      $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28
    )
  `;

  try {
    await query(sqlQuery, [
      id, tenantId, rut, datos.apellido_paterno || '', datos.apellido_materno || '', 
      datos.nombre || '', datos.email || '', datos.celular || '', datos.sexo || '', 
      datos.activo === 'TRUE', datos.fecha_contrato || null, datos.instalacion || '', 
      datos.jornada || '', datos.banco || '', datos.tipo_cuenta || '', 
      datos.numero_cuenta || '', datos.anticipo || 0, datos.fecha_nacimiento || null, 
      datos.direccion || '', datos.comuna || '', datos.ciudad || '', 
      datos.nacionalidad || '', datos.fecha_os10 || null, new Date(), null, new Date(),
      coords.latitud, coords.longitud
    ]);
    
    console.log(`✅ Guardia ${rut} cargado exitosamente`);
    return true;
  } catch (error) {
    console.error(`❌ Error cargando guardia ${rut}:`, error);
    return false;
  }
}

// Función principal
async function cargarRutsEspecificos() {
  console.log('🚀 Iniciando carga de RUTs específicos...');
  
  // Leer el archivo CSV
  const fs = require('fs');
  const csv = require('csv-parser');
  const resultados: any[] = [];

  return new Promise((resolve, reject) => {
    fs.createReadStream('BBDD GGSS.csv')
      .pipe(csv())
      .on('data', (data: any) => {
        // Solo procesar los RUTs específicos
        if (rutsEspecificos.includes(data.RUT)) {
          resultados.push(data);
        }
      })
      .on('end', async () => {
        console.log(`📊 Encontrados ${resultados.length} guardias de los ${rutsEspecificos.length} RUTs especificados`);
        
        let exitosos = 0;
        let fallidos = 0;
        
        for (const guardia of resultados) {
          const resultado = await cargarGuardia(guardia.RUT, guardia);
          if (resultado) {
            exitosos++;
          } else {
            fallidos++;
          }
          
          // Pequeña pausa para no sobrecargar la base de datos
          await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        console.log(`\n📈 Resumen de carga:`);
        console.log(`✅ Exitosos: ${exitosos}`);
        console.log(`❌ Fallidos: ${fallidos}`);
        console.log(`📊 Total procesados: ${resultados.length}`);
        
        resolve({ exitosos, fallidos, total: resultados.length });
      })
      .on('error', reject);
  });
}

// Ejecutar el script
if (require.main === module) {
  cargarRutsEspecificos()
    .then(() => {
      console.log('🎉 Proceso completado');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Error en el proceso:', error);
      process.exit(1);
    });
}

export { cargarRutsEspecificos }; 