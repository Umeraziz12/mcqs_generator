import os
from typing import List
from langchain_community.document_loaders import PyPDFLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_community.vectorstores import FAISS
from langchain_huggingface import HuggingFaceEmbeddings

class RAGEngine:
    def __init__(self, model_name: str = "all-MiniLM-L6-v2"):
        """Initializes the RAG Engine with a local embedding model."""
        self.embeddings = HuggingFaceEmbeddings(model_name=model_name)
        self.text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=1000,
            chunk_overlap=200,
            length_function=len,
        )
        self.vector_store = None

    def process_text(self, text: str):
        """Chunks the text and creates a FAISS vector store in memory."""
        chunks = self.text_splitter.split_text(text)
        self.vector_store = FAISS.from_texts(chunks, self.embeddings)
        return len(chunks)

    def retrieve_context(self, query: str, k: int = 5) -> str:
        """Retrieves the most relevant chunks for a given query."""
        if not self.vector_store:
            return ""
        
        docs = self.vector_store.similarity_search(query, k=k)
        context = "\n\n---\n\n".join([doc.page_content for doc in docs])
        return context

    def get_diverse_context(self, k: int = 5) -> str:
        """
        If no specific topic is provided, retrieves a diverse set of chunks 
        from across the document to ensure broad coverage.
        """
        if not self.vector_store:
            return ""
        
        # Simple implementation: just take the first k chunks if no query is present
        # Or use Max Marginal Relevance (MMR) for diversity
        docs = self.vector_store.max_marginal_relevance_search("summary", k=k, fetch_k=20)
        context = "\n\n---\n\n".join([doc.page_content for doc in docs])
        return context
