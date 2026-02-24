import React from 'react';
import {
  FlexWidget,
  TextWidget,
  ListWidget,
} from 'react-native-android-widget';

interface ExpiringFood {
  name: string;
  daysLeft: number;
  listName: string;
}

interface ExpiringFoodsWidgetProps {
  expiringFoods: ExpiringFood[];
}

function getExpirationColor(daysLeft: number): string {
  if (daysLeft < 0) return '#EF4444'; // Rouge - expiré
  if (daysLeft === 0) return '#F97316'; // Orange - aujourd'hui
  if (daysLeft <= 2) return '#EAB308'; // Jaune - très bientôt
  return '#3C6E47'; // Vert - ok
}

function getExpirationText(daysLeft: number): string {
  if (daysLeft < 0) return 'Expiré';
  if (daysLeft === 0) return "Aujourd'hui";
  if (daysLeft === 1) return 'Demain';
  return `${daysLeft}j`;
}

function FoodItem({ food }: { food: ExpiringFood }) {
  const color = getExpirationColor(food.daysLeft);

  return (
    <FlexWidget
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 4,
        paddingHorizontal: 8,
        backgroundColor: '#FFFFFF',
        borderRadius: 8,
        marginBottom: 4,
      }}
    >
      <FlexWidget
        style={{
          width: 8,
          height: 8,
          borderRadius: 4,
          backgroundColor: color as any,
          marginRight: 8,
        }}
      />
      <FlexWidget style={{ flex: 1 }}>
        <TextWidget
          text={food.name}
          style={{
            fontSize: 14,
            color: '#3C6E47',
            fontWeight: '600',
          }}
          maxLines={1}
        />
        <TextWidget
          text={food.listName}
          style={{
            fontSize: 10,
            color: '#6A8A6E',
          }}
          maxLines={1}
        />
      </FlexWidget>
      <FlexWidget
        style={{
          backgroundColor: (color + '20') as any,
          paddingHorizontal: 8,
          paddingVertical: 2,
          borderRadius: 10,
        }}
      >
        <TextWidget
          text={getExpirationText(food.daysLeft)}
          style={{
            fontSize: 11,
            color: color as any,
            fontWeight: '700',
          }}
        />
      </FlexWidget>
    </FlexWidget>
  );
}

export function ExpiringFoodsWidget({ expiringFoods }: ExpiringFoodsWidgetProps) {
  const hasExpiring = expiringFoods.length > 0;

  return (
    <FlexWidget
      style={{
        flex: 1,
        backgroundColor: '#F7F5E6',
        borderRadius: 16,
        padding: 12,
      }}
      clickAction="OPEN_APP"
    >
      {/* Header */}
      <FlexWidget
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          marginBottom: 8,
        }}
      >
        <TextWidget
          text="🥗"
          style={{ fontSize: 20, marginRight: 8 }}
        />
        <FlexWidget style={{ flex: 1 }}>
          <TextWidget
            text="ZeroGaspy"
            style={{
              fontSize: 16,
              fontWeight: '700',
              color: '#3C6E47',
            }}
          />
          <TextWidget
            text={hasExpiring ? `${expiringFoods.length} aliment${expiringFoods.length > 1 ? 's' : ''} à surveiller` : 'Tout va bien !'}
            style={{
              fontSize: 11,
              color: '#6A8A6E',
            }}
          />
        </FlexWidget>
        {hasExpiring && (
          <FlexWidget
            style={{
              backgroundColor: '#EF4444',
              width: 24,
              height: 24,
              borderRadius: 12,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <TextWidget
              text={expiringFoods.length > 9 ? '9+' : String(expiringFoods.length)}
              style={{
                fontSize: 12,
                fontWeight: '700',
                color: '#FFFFFF',
              }}
            />
          </FlexWidget>
        )}
      </FlexWidget>

      {/* Liste des aliments */}
      {hasExpiring ? (
        <ListWidget
          style={
            {
              flex: 1,
            } as any
          }
        >
          {expiringFoods.slice(0, 4).map((food, index) => (
            <FoodItem key={index} food={food} />
          ))}
          {expiringFoods.length > 4 && (
            <FlexWidget
              style={{
                alignItems: 'center',
                paddingVertical: 4,
              }}
            >
              <TextWidget
                text={`+ ${expiringFoods.length - 4} autre${expiringFoods.length - 4 > 1 ? 's' : ''}`}
                style={{
                  fontSize: 11,
                  color: '#6A8A6E',
                  fontStyle: 'italic',
                }}
              />
            </FlexWidget>
          )}
        </ListWidget>
      ) : (
        <FlexWidget
          style={{
            flex: 1,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <TextWidget
            text="✨"
            style={{ fontSize: 32, marginBottom: 4 }}
          />
          <TextWidget
            text="Aucun aliment n'expire bientôt"
            style={{
              fontSize: 12,
              color: '#6A8A6E',
              textAlign: 'center',
            }}
          />
        </FlexWidget>
      )}
    </FlexWidget>
  );
}
