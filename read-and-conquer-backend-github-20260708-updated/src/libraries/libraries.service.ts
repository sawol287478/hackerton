import { BadRequestException, HttpStatus, Injectable } from '@nestjs/common';
import { BusinessCode } from '../common/exceptions/business-code';
import { BusinessException } from '../common/exceptions/business.exception';
import { getDistanceMeters } from '../common/utils/geo';
import { KakaoLocalClient } from '../integrations/services/kakao-local.client';
import { LibraryInfoClient } from '../integrations/services/library-info.client';
import { PrismaService } from '../prisma/prisma.service';
import { ListLibrariesDto } from './dto/list-libraries.dto';

@Injectable()
export class LibrariesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly kakaoLocal: KakaoLocalClient,
    private readonly libraryInfo: LibraryInfoClient,
  ) {}

  async findNearby(query: ListLibrariesDto) {
    const point = this.resolvePoint(query);
    const radiusMeters = this.resolveRadius(query);
    let candidates = await this.findDbCandidates(query, radiusMeters);

    if (candidates.length === 0) {
      await this.cacheKakaoLibraries(
        point.latitude,
        point.longitude,
        radiusMeters,
      );
      candidates = await this.findDbCandidates(query, radiusMeters);
    }

    return candidates
      .map((library) => {
        const distance = Math.round(
          getDistanceMeters(point, {
            latitude: library.latitude,
            longitude: library.longitude,
          }),
        );

        return {
          libraryId: library.libraryId,
          name: library.libraryName,
          address: library.address,
          latitude: library.latitude,
          longitude: library.longitude,
          distance,
          occupiedFaction: library.currentOccupiedFaction
            ? {
                factionId: library.currentOccupiedFaction.factionId,
                name: library.currentOccupiedFaction.factionName,
                color: library.currentOccupiedFaction.factionColor,
              }
            : null,
        };
      })
      .filter((library) => library.distance <= radiusMeters)
      .sort((a, b) => a.distance - b.distance);
  }

  async syncFromLibraryInfo(pageNo: number, pageSize: number) {
    const externalLibraries = await this.libraryInfo.searchLibraries(
      pageNo,
      pageSize,
    );
    let createdOrUpdated = 0;
    let skipped = 0;

    for (const library of externalLibraries) {
      if (!library.name || !library.address) {
        skipped += 1;
        continue;
      }

      const geo = await this.kakaoLocal.geocodeAddress(library.address);
      if (!geo) {
        skipped += 1;
        continue;
      }

      await this.prisma.library.upsert({
        where: {
          libraryName_address: {
            libraryName: library.name,
            address: library.address,
          },
        },
        update: {
          externalLibraryCode: library.code,
          latitude: geo.latitude,
          longitude: geo.longitude,
          region: library.region || this.extractRegion(library.address),
        },
        create: {
          externalLibraryCode: library.code,
          libraryName: library.name,
          address: library.address,
          latitude: geo.latitude,
          longitude: geo.longitude,
          region: library.region || this.extractRegion(library.address),
        },
      });
      createdOrUpdated += 1;
    }

    return {
      pageNo,
      pageSize,
      createdOrUpdated,
      skipped,
    };
  }

  async findNationwide(pageNo: number, pageSize: number) {
    return this.libraryInfo.searchLibraries(pageNo, pageSize);
  }

  async searchNearbyFromKakao(query: ListLibrariesDto) {
    const point = this.resolvePoint(query);
    const radiusMeters = this.resolveRadius(query);
    const places = await this.kakaoLocal.searchLibraries(
      point.latitude,
      point.longitude,
      radiusMeters,
    );

    return places.map((place) => ({
      ...place,
      distanceMeters: Math.round(
        getDistanceMeters(point, {
          latitude: place.latitude,
          longitude: place.longitude,
        }),
      ),
    }));
  }

  async geocodeAddress(address: string) {
    if (!address.trim()) {
      return null;
    }
    return this.kakaoLocal.geocodeAddress(address);
  }

  async findDetail(libraryId: number) {
    const library = await this.prisma.library.findUnique({
      where: { libraryId },
      include: {
        currentOccupiedFaction: true,
        influences: {
          include: { faction: true },
          orderBy: { influenceScore: 'desc' },
        },
      },
    });

    if (!library) {
      throw new BusinessException(
        BusinessCode.LIBRARY_NOT_FOUND,
        'Library not found',
        HttpStatus.NOT_FOUND,
      );
    }

    return {
      libraryId: library.libraryId,
      libraryName: library.libraryName,
      address: library.address,
      latitude: library.latitude,
      longitude: library.longitude,
      operatingHours: library.operatingHours,
      closedDays: library.closedDays,
      currentOccupiedFaction: library.currentOccupiedFaction
        ? {
            factionId: library.currentOccupiedFaction.factionId,
            name: library.currentOccupiedFaction.factionName,
            color: library.currentOccupiedFaction.factionColor,
          }
        : null,
      influences: library.influences.map((influence) => ({
        factionId: influence.factionId,
        faction: influence.faction.factionName,
        color: influence.faction.factionColor,
        score: influence.influenceScore,
      })),
      canStartReading: false,
    };
  }

  private async findDbCandidates(query: ListLibrariesDto, radiusMeters: number) {
    const point = this.resolvePoint(query);
    const latDelta = radiusMeters / 111000;
    const lngDelta =
      radiusMeters / (111000 * Math.cos((point.latitude * Math.PI) / 180));

    return this.prisma.library.findMany({
      where: {
        latitude: {
          gte: point.latitude - latDelta,
          lte: point.latitude + latDelta,
        },
        longitude: {
          gte: point.longitude - lngDelta,
          lte: point.longitude + lngDelta,
        },
      },
      include: {
        currentOccupiedFaction: true,
      },
      take: 300,
    });
  }

  private async cacheKakaoLibraries(
    latitude: number,
    longitude: number,
    radiusMeters: number,
  ) {
    const places = await this.kakaoLocal.searchLibraries(
      latitude,
      longitude,
      radiusMeters,
    );

    await Promise.all(
      places.map((place) =>
        this.prisma.library.upsert({
          where: {
            libraryName_address: {
              libraryName: place.placeName,
              address: place.roadAddressName ?? place.addressName,
            },
          },
          update: {
            latitude: place.latitude,
            longitude: place.longitude,
            region: this.extractRegion(place.addressName),
          },
          create: {
            libraryName: place.placeName,
            address: place.roadAddressName ?? place.addressName,
            latitude: place.latitude,
            longitude: place.longitude,
            region: this.extractRegion(place.addressName),
          },
        }),
      ),
    );
  }

  private extractRegion(address: string) {
    return address.split(' ').slice(0, 2).join(' ') || 'UNKNOWN';
  }

  private resolvePoint(query: ListLibrariesDto) {
    const latitude = query.latitude ?? query.lat;
    const longitude = query.longitude ?? query.lng;

    if (latitude === undefined || longitude === undefined) {
      throw new BadRequestException('latitude and longitude are required');
    }

    return { latitude, longitude };
  }

  private resolveRadius(query: ListLibrariesDto) {
    return query.radius ?? query.radiusMeters ?? 5000;
  }
}
