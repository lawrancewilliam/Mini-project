import { ML_TRAINING_DATA } from '../src/lib/training-data.js';

function tokenize(text) {
  const tokens = [];
  const words = text.toLowerCase().split(/[\s\.\=\:\;\(\)\[\]{},'"\/\\_-]+/);
  for (const word of words) {
    if (word.length > 2) tokens.push(word);
  }
  return tokens;
}

function buildVocabulary(data) {
  const vocab = new Set();
  for (const item of data) {
    for (const t of tokenize(item.text)) vocab.add(t);
  }
  return Array.from(vocab).sort();
}

function textToVector(text, vocab) {
  const tokens = tokenize(text);
  const vector = new Array(vocab.length).fill(0);
  const map = {};
  vocab.forEach((t, i) => map[t] = i);
  for (const t of tokens) {
    if (map[t] !== undefined) vector[map[t]]++;
  }
  return vector;
}

function cosineSimilarity(v1, v2) {
  let dot = 0, m1 = 0, m2 = 0;
  for (let i = 0; i < v1.length; i++) {
    dot += v1[i] * v2[i];
    m1 += v1[i] * v1[i];
    m2 += v2[i] * v2[i];
  }
  if (m1 === 0 || m2 === 0) return 0;
  return dot / (Math.sqrt(m1) * Math.sqrt(m2));
}

function computeIDF(data, vocab) {
  const df = new Array(vocab.length).fill(0);
  const N = data.length;
  const map = {};
  vocab.forEach((t, i) => map[t] = i);
  for (const item of data) {
    const seen = new Set(tokenize(item.text));
    for (const t of seen) {
      if (map[t] !== undefined) df[map[t]]++;
    }
  }
  return df.map(count => Math.log((N + 1) / (count + 1)) + 1);
}

function textToVectorTFIDF(text, vocab, idf) {
  const tokens = tokenize(text);
  const vector = new Array(vocab.length).fill(0);
  const map = {};
  vocab.forEach((t, i) => map[t] = i);
  for (const t of tokens) {
    if (map[t] !== undefined) vector[map[t]]++;
  }
  for (let i = 0; i < vector.length; i++) {
    if (vector[i] > 0) vector[i] *= idf[i];
  }
  return vector;
}

// shuffle
const data = [...ML_TRAINING_DATA].sort(() => Math.random() - 0.5);
const testSize = Math.floor(data.length * 0.2);
const test = data.slice(0, testSize);
const train = data.slice(testSize);

const vocab = buildVocabulary(train);
const idf = computeIDF(train, vocab);
const centroids = {};
for (const label of ['LEAK_CONFIRMED', 'TEST_DATA', 'FALSE_POSITIVE']) {
  const vectors = train.filter(d => d.label === label).map(d => textToVectorTFIDF(d.text, vocab, idf));
  const c = new Array(vocab.length).fill(0);
  for (const v of vectors) for (let i = 0; i < v.length; i++) c[i] += v[i];
  for (let i = 0; i < c.length; i++) c[i] /= vectors.length;
  centroids[label] = c;
}

const confMatrix = { LEAK_CONFIRMED: {}, TEST_DATA: {}, FALSE_POSITIVE: {} };
let correct = 0;
for (const item of test) {
  const v = textToVectorTFIDF(item.text, vocab, idf);
  let best = 'TEST_DATA', bestScore = 0;
  for (const label in centroids) {
    const s = cosineSimilarity(v, centroids[label]);
    if (s > bestScore) { bestScore = s; best = label; }
  }
  if (best === item.label) correct++;
  confMatrix[item.label][best] = (confMatrix[item.label][best] || 0) + 1;
}

console.log('Test size:', test.length, '| Accuracy:', (correct / test.length * 100).toFixed(1) + '%');
console.log('Vocab size:', vocab.length);
console.log('Confusion matrix (actual -> predicted):');
console.log(JSON.stringify(confMatrix, null, 2));
