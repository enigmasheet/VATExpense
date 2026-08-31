export interface Category {
  id: string;
  name: string;
  normalizedName: string;
  isActive: boolean;
}

export interface Location {
  id: string;
  name: string;
  normalizedName: string;
  isActive: boolean;
}

export interface Truck {
  id: string;
  name: string;
  normalizedName: string;
  ownerName: string | null;
  truckType: string;
  isActive: boolean;
}

export interface Party {
  id: string;
  name: string;
  normalizedName: string;
  vatNumber: string | null;
  normalizedVatNumber: string | null;
  locationId: string | null;
  locationName: string | null;
  isActive: boolean;
}

export interface ItemCategoryLink {
  id: string;
  itemName: string;
  categoryId: string;
  categoryName: string;
}
