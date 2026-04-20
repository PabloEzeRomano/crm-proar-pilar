import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { supabase } from '../lib/supabase';
import {
  ClientProduct,
  Product,
  ProductPresentation,
  QuoteItem,
} from '../types';
import {
  CreateProductInput,
  CreatePresentationInput,
  UpdateProductInput,
  UpdatePresentationInput,
} from '../validators/product';

interface ProductsState {
  products: Product[];
  loading: boolean;
  error: string | null;

  // Client habitual products
  clientProducts: ClientProduct[];
  clientProductsLoading: boolean;

  fetchProducts: () => Promise<void>;

  createProduct: (data: CreateProductInput) => Promise<Product | null>;
  updateProduct: (id: string, data: UpdateProductInput) => Promise<void>;
  deleteProduct: (id: string) => Promise<void>;

  addPresentation: (
    productId: string,
    data: CreatePresentationInput
  ) => Promise<ProductPresentation | null>;
  updatePresentation: (
    id: string,
    data: UpdatePresentationInput
  ) => Promise<void>;
  deletePresentation: (id: string) => Promise<void>;

  fetchClientProducts: (clientId: string) => Promise<void>;
  addClientProduct: (
    clientId: string,
    productId: string,
    presentationId: string
  ) => Promise<void>;
  removeClientProduct: (id: string) => Promise<void>;
  syncClientProducts: (clientId: string, items: QuoteItem[]) => Promise<void>;
}

export const useProductsStore = create<ProductsState>()(
  persist(
    (set, get) => ({
      products: [],
      loading: false,
      error: null,
      clientProducts: [],
      clientProductsLoading: false,

      fetchProducts: async () => {
        set({ loading: true, error: null });

        const { data, error } = await supabase
          .from('products')
          .select('*, presentations:product_presentations(*)')
          .order('name', { ascending: true });

        if (error) {
          set({ error: error.message, loading: false });
          return;
        }

        set({ products: (data as Product[]) ?? [], loading: false });
      },

      createProduct: async (input: CreateProductInput) => {
        set({ error: null });

        const { presentations, ...productData } = input;

        const { data: created, error: productError } = await supabase
          .from('products')
          .insert(productData)
          .select()
          .single();

        if (productError) {
          set({ error: productError.message });
          return null;
        }

        const product = created as Omit<Product, 'presentations'>;

        const presRows = presentations.map((p) => ({
          ...p,
          product_id: product.id,
        }));
        const { data: createdPres, error: presError } = await supabase
          .from('product_presentations')
          .insert(presRows)
          .select();

        if (presError) {
          set({ error: presError.message });
          return null;
        }

        const full: Product = {
          ...product,
          presentations: (createdPres as ProductPresentation[]) ?? [],
        };
        set((state) => ({
          products: [...state.products, full].sort((a, b) =>
            a.name.localeCompare(b.name)
          ),
        }));
        return full;
      },

      updateProduct: async (id: string, data: UpdateProductInput) => {
        set({ error: null });

        const { data: updated, error } = await supabase
          .from('products')
          .update(data)
          .eq('id', id)
          .select()
          .single();

        if (error) {
          set({ error: error.message });
          return;
        }

        set((state) => ({
          products: state.products.map((p) =>
            p.id === id ? { ...p, ...(updated as Partial<Product>) } : p
          ),
        }));
      },

      deleteProduct: async (id: string) => {
        set({ error: null });

        const { error } = await supabase.from('products').delete().eq('id', id);

        if (error) {
          set({ error: error.message });
          return;
        }

        set((state) => ({
          products: state.products.filter((p) => p.id !== id),
        }));
      },

      addPresentation: async (
        productId: string,
        data: CreatePresentationInput
      ) => {
        set({ error: null });

        const { data: created, error } = await supabase
          .from('product_presentations')
          .insert({ ...data, product_id: productId })
          .select()
          .single();

        if (error) {
          set({ error: error.message });
          return null;
        }

        const pres = created as ProductPresentation;

        set((state) => ({
          products: state.products.map((p) =>
            p.id === productId
              ? { ...p, presentations: [...p.presentations, pres] }
              : p
          ),
        }));

        return pres;
      },

      updatePresentation: async (id: string, data: UpdatePresentationInput) => {
        set({ error: null });

        const { data: updated, error } = await supabase
          .from('product_presentations')
          .update(data)
          .eq('id', id)
          .select()
          .single();

        if (error) {
          set({ error: error.message });
          return;
        }

        const pres = updated as ProductPresentation;

        set((state) => ({
          products: state.products.map((p) => ({
            ...p,
            presentations: p.presentations.map((pr) =>
              pr.id === id ? pres : pr
            ),
          })),
        }));
      },

      deletePresentation: async (id: string) => {
        set({ error: null });

        const { error } = await supabase
          .from('product_presentations')
          .delete()
          .eq('id', id);

        if (error) {
          set({ error: error.message });
          return;
        }

        set((state) => ({
          products: state.products.map((p) => ({
            ...p,
            presentations: p.presentations.filter((pr) => pr.id !== id),
          })),
        }));
      },

      fetchClientProducts: async (clientId: string) => {
        set({ clientProductsLoading: true });

        const { data, error } = await supabase
          .from('client_products')
          .select('*')
          .eq('client_id', clientId);

        if (error || !data) {
          set({ clientProductsLoading: false });
          return;
        }

        set({
          clientProducts: data as ClientProduct[],
          clientProductsLoading: false,
        });
      },

      addClientProduct: async (
        clientId: string,
        productId: string,
        presentationId: string
      ) => {
        set({ error: null });

        const existing = get().clientProducts.find(
          (cp) =>
            cp.client_id === clientId &&
            cp.product_id === productId &&
            cp.product_presentation_id === presentationId
        );
        if (existing) return;

        const { data, error } = await supabase
          .from('client_products')
          .insert({
            client_id: clientId,
            product_id: productId,
            product_presentation_id: presentationId,
          })
          .select()
          .single();

        if (error) {
          set({ error: error.message });
          return;
        }

        set((state) => ({
          clientProducts: [...state.clientProducts, data as ClientProduct],
        }));
      },

      removeClientProduct: async (id: string) => {
        set({ error: null });

        const { error } = await supabase
          .from('client_products')
          .delete()
          .eq('id', id);

        if (error) {
          set({ error: error.message });
          return;
        }

        set((state) => ({
          clientProducts: state.clientProducts.filter((cp) => cp.id !== id),
        }));
      },

      syncClientProducts: async (clientId: string, items: QuoteItem[]) => {
        await get().fetchClientProducts(clientId);
        for (const item of items) {
          await get().addClientProduct(
            clientId,
            item.product_id,
            item.presentation_id
          );
        }
      },
    }),
    {
      name: 'products-store',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ products: state.products }),
    }
  )
);
