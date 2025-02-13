// Define common interfaces for type safety
interface Price {
  current: number;
  cash?: number; // Optional cash price
  lastSaved: number;
}

interface GasStation {
  name: string;
  prices: {
    regular: Price;
    mid: Price;
    premium: Price;
  };
}