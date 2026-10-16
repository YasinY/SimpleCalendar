import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { inflateRawSync } from 'node:zlib';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUTPUT_PATH = path.join(ROOT, 'src', 'renderer', 'weather', 'cities.js');
const DOWNLOAD_DIR = process.argv[2] ?? path.join(tmpdir(), 'simplecalendar-geonames');
const GEONAMES_BASE_URL = 'https://download.geonames.org/export/dump/';
const CITIES_ARCHIVE = 'cities1000.zip';
const CITIES_FILE = 'cities1000.txt';
const ADMIN_FILE = 'admin1CodesASCII.txt';
const ALTERNATE_NAMES_DIR = 'alternatenames/';
const ARCHIVE_EXTENSION = '.zip';
const TEXT_EXTENSION = '.txt';
const GERMAN_LANGUAGE = 'de';
const PREFERRED_FLAG = '1';
const FILE_ENCODING = 'utf8';
const COLUMN_SEPARATOR = '\t';
const LINE_SEPARATOR = '\n';
const ADMIN_CODE_SEPARATOR = '.';
const MINIMUM_POPULATION = 5000;
const LOCAL_MINIMUM_POPULATION = 1000;
const LOCAL_COUNTRIES = new Set(['DE', 'AT', 'CH']);
const EXCLUDED_FEATURE_CODES = new Set(['PPLX', 'PPLH', 'PPLQ', 'PPLW', 'PPLCH']);
const COORDINATE_DECIMALS = 2;
const COLUMNS = { ID: 0, NAME: 1, LATITUDE: 4, LONGITUDE: 5, FEATURE_CODE: 7, COUNTRY: 8, ADMIN1: 10, POPULATION: 14 };
const ADMIN_COLUMNS = { CODE: 0, NAME: 1 };
const ALTERNATE_COLUMNS = { GEONAME_ID: 1, LANGUAGE: 2, NAME: 3, PREFERRED: 4 };
const NO_REGION = '';
const ZIP = {
  END_OF_CENTRAL_DIRECTORY: 0x06054b50,
  CENTRAL_FILE_HEADER: 0x02014b50,
  LOCAL_FILE_HEADER: 0x04034b50,
  END_RECORD_MIN_LENGTH: 22,
  CENTRAL_HEADER_LENGTH: 46,
  LOCAL_HEADER_LENGTH: 30,
  DEFLATE: 8
};

const GERMAN_REGION_NAMES = {
  'Baden-Wurttemberg': 'Baden-Württemberg',
  'State of Berlin': 'Berlin',
  Bavaria: 'Bayern',
  Hesse: 'Hessen',
  'Lower Saxony': 'Niedersachsen',
  'North Rhine-Westphalia': 'Nordrhein-Westfalen',
  'Rhineland-Palatinate': 'Rheinland-Pfalz',
  Saxony: 'Sachsen',
  'Saxony-Anhalt': 'Sachsen-Anhalt',
  Thuringia: 'Thüringen',
  Carinthia: 'Kärnten',
  'Lower Austria': 'Niederösterreich',
  'Upper Austria': 'Oberösterreich',
  Styria: 'Steiermark',
  Tyrol: 'Tirol',
  Vienna: 'Wien',
  Zurich: 'Zürich',
  Geneva: 'Genf',
  Lucerne: 'Luzern',
  Grisons: 'Graubünden',
  Valais: 'Wallis',
  Vaud: 'Waadt',
  Fribourg: 'Freiburg',
  Neuchâtel: 'Neuenburg',
  Ticino: 'Tessin',
  'Basel-City': 'Basel-Stadt',
  'Saint Gallen': 'St. Gallen'
};

async function download(fileName) {
  const target = path.join(DOWNLOAD_DIR, path.basename(fileName));
  if (existsSync(target)) return target;
  const response = await fetch(GEONAMES_BASE_URL + fileName);
  if (!response.ok) throw new Error('download failed: ' + fileName + ' ' + response.status);
  writeFileSync(target, Buffer.from(await response.arrayBuffer()));
  return target;
}

function findEndOfCentralDirectory(archive) {
  for (let offset = archive.length - ZIP.END_RECORD_MIN_LENGTH; offset >= 0; offset -= 1) {
    if (archive.readUInt32LE(offset) === ZIP.END_OF_CENTRAL_DIRECTORY) return offset;
  }
  throw new Error('zip end record not found');
}

function readZipEntry(archive, entryName) {
  const endRecord = findEndOfCentralDirectory(archive);
  const entryCount = archive.readUInt16LE(endRecord + 10);
  let offset = archive.readUInt32LE(endRecord + 16);
  for (let index = 0; index < entryCount; index += 1) {
    if (archive.readUInt32LE(offset) !== ZIP.CENTRAL_FILE_HEADER) throw new Error('zip central header expected');
    const method = archive.readUInt16LE(offset + 10);
    const compressedSize = archive.readUInt32LE(offset + 20);
    const nameLength = archive.readUInt16LE(offset + 28);
    const extraLength = archive.readUInt16LE(offset + 30);
    const commentLength = archive.readUInt16LE(offset + 32);
    const localOffset = archive.readUInt32LE(offset + 42);
    const name = archive.toString(FILE_ENCODING, offset + ZIP.CENTRAL_HEADER_LENGTH, offset + ZIP.CENTRAL_HEADER_LENGTH + nameLength);
    offset += ZIP.CENTRAL_HEADER_LENGTH + nameLength + extraLength + commentLength;
    if (name !== entryName) continue;
    if (archive.readUInt32LE(localOffset) !== ZIP.LOCAL_FILE_HEADER) throw new Error('zip local header expected');
    const dataStart = localOffset + ZIP.LOCAL_HEADER_LENGTH + archive.readUInt16LE(localOffset + 26) + archive.readUInt16LE(localOffset + 28);
    const data = archive.subarray(dataStart, dataStart + compressedSize);
    return method === ZIP.DEFLATE ? inflateRawSync(data) : data;
  }
  throw new Error('zip entry not found: ' + entryName);
}

function parseRows(text) {
  return text.split(LINE_SEPARATOR).filter((line) => line.length > 0).map((line) => line.split(COLUMN_SEPARATOR));
}

function buildRegionNames(adminRows) {
  const names = new Map();
  for (const row of adminRows) {
    const name = row[ADMIN_COLUMNS.NAME];
    names.set(row[ADMIN_COLUMNS.CODE], GERMAN_REGION_NAMES[name] ?? name);
  }
  return names;
}

function qualifies(row) {
  if (EXCLUDED_FEATURE_CODES.has(row[COLUMNS.FEATURE_CODE])) return false;
  const population = Number(row[COLUMNS.POPULATION]);
  const minimum = LOCAL_COUNTRIES.has(row[COLUMNS.COUNTRY]) ? LOCAL_MINIMUM_POPULATION : MINIMUM_POPULATION;
  return population >= minimum;
}

function roundCoordinate(value) {
  return Number(Number(value).toFixed(COORDINATE_DECIMALS));
}

async function loadGermanNames(country, geonameIds) {
  const archive = readFileSync(await download(ALTERNATE_NAMES_DIR + country + ARCHIVE_EXTENSION));
  const names = new Map();
  for (const row of parseRows(readZipEntry(archive, country + TEXT_EXTENSION).toString(FILE_ENCODING))) {
    if (row[ALTERNATE_COLUMNS.LANGUAGE] !== GERMAN_LANGUAGE) continue;
    const id = row[ALTERNATE_COLUMNS.GEONAME_ID];
    if (!geonameIds.has(id)) continue;
    const preferred = row[ALTERNATE_COLUMNS.PREFERRED] === PREFERRED_FLAG;
    if (preferred || !names.has(id)) names.set(id, row[ALTERNATE_COLUMNS.NAME]);
  }
  return names;
}

async function buildGermanNames(rows) {
  const names = new Map();
  for (const country of LOCAL_COUNTRIES) {
    const ids = new Set(rows.filter((row) => row[COLUMNS.COUNTRY] === country).map((row) => row[COLUMNS.ID]));
    for (const [id, name] of await loadGermanNames(country, ids)) names.set(id, name);
  }
  return names;
}

function toCityRow(row, regionNames, germanNames) {
  const country = row[COLUMNS.COUNTRY];
  const region = regionNames.get(country + ADMIN_CODE_SEPARATOR + row[COLUMNS.ADMIN1]) ?? NO_REGION;
  return [
    germanNames.get(row[COLUMNS.ID]) ?? row[COLUMNS.NAME],
    region,
    country,
    roundCoordinate(row[COLUMNS.LATITUDE]),
    roundCoordinate(row[COLUMNS.LONGITUDE]),
    Number(row[COLUMNS.POPULATION])
  ];
}

function byPopulationDescending(first, second) {
  return second[5] - first[5];
}

function renderModule(cities) {
  const header = '// generated by scripts/generateCities.mjs from geonames.org (cc by 4.0), do not edit by hand\n';
  return header + 'export default ' + JSON.stringify(cities) + ';\n';
}

mkdirSync(DOWNLOAD_DIR, { recursive: true });
const archive = readFileSync(await download(CITIES_ARCHIVE));
const regionNames = buildRegionNames(parseRows(readFileSync(await download(ADMIN_FILE), FILE_ENCODING)));
const qualifyingRows = parseRows(readZipEntry(archive, CITIES_FILE).toString(FILE_ENCODING)).filter(qualifies);
const germanNames = await buildGermanNames(qualifyingRows);
const cities = qualifyingRows.map((row) => toCityRow(row, regionNames, germanNames)).sort(byPopulationDescending);
writeFileSync(OUTPUT_PATH, renderModule(cities), FILE_ENCODING);
process.stdout.write('cities written: ' + OUTPUT_PATH + ' (' + cities.length + ' entries)\n');
