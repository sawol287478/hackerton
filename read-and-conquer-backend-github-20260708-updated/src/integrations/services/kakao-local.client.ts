import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface KakaoPlace {
  id: string;
  placeName: string;
  addressName: string;
  roadAddressName?: string;
  latitude: number;
  longitude: number;
}

@Injectable()
export class KakaoLocalClient {
  private readonly baseUrl = 'https://dapi.kakao.com/v2/local';

  constructor(private readonly config: ConfigService) {}

  async searchLibraries(latitude: number, longitude: number, radius = 5000) {
    return this.searchKeyword('도서관', latitude, longitude, radius);
  }

  async searchKeyword(
    keyword: string,
    latitude?: number,
    longitude?: number,
    radius = 5000,
  ) {
    const params: Record<string, string> = {
      query: keyword,
      size: '15',
    };
    if (latitude !== undefined && longitude !== undefined) {
      params.x = String(longitude);
      params.y = String(latitude);
      params.radius = String(radius);
    }

    const json = await this.getJson('/search/keyword.json', params);
    return this.toPlaces(json?.documents ?? []);
  }

  async geocodeAddress(address: string) {
    const json = await this.getJson('/search/address.json', { query: address });
    const first = json?.documents?.[0];
    if (!first) {
      return null;
    }

    return {
      latitude: Number(first.y),
      longitude: Number(first.x),
      addressName: String(first.address_name ?? address),
    };
  }

  private async getJson(path: string, params: Record<string, string>) {
    const apiKey = this.config.get<string>('KAKAO_REST_API_KEY');
    if (!apiKey) {
      return null;
    }

    const url = new URL(`${this.baseUrl}${path}`);
    Object.entries(params).forEach(([key, value]) =>
      url.searchParams.set(key, value),
    );

    const response = await fetch(url, {
      headers: { Authorization: `KakaoAK ${apiKey}` },
    });
    if (!response.ok) {
      throw new Error(`Kakao Local API failed: ${response.status}`);
    }
    return response.json();
  }

  private toPlaces(documents: any[]): KakaoPlace[] {
    return documents.map((place) => ({
      id: String(place.id),
      placeName: String(place.place_name),
      addressName: String(place.address_name),
      roadAddressName: place.road_address_name
        ? String(place.road_address_name)
        : undefined,
      latitude: Number(place.y),
      longitude: Number(place.x),
    }));
  }
}
