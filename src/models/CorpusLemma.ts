import { Document, Schema, model } from "mongoose";
import { DocumentFrequency, DocumentFrequencySchema } from "./DocumentFrequency";

export interface CorpusLemma extends Document {
    lemma: string;
    frequencies: Array<DocumentFrequency>;
}

const CorpusLemmaSchema = new Schema({
    lemma: String,
    frequencies: [DocumentFrequencySchema]
});

export const CorpusLemma = model("CorpusLemma", CorpusLemmaSchema);