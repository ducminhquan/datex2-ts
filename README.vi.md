# datex2-ts

Thư viện data model TypeScript cho **DATEX II v3** (bản mã hoá JSON), viết theo
hướng dễ dùng cho dev.

DATEX II là chuẩn châu Âu để trao đổi thông tin giao thông. Bản mã hoá JSON của
nó bám sát mô hình UML nên rất chính xác — nhưng viết tay thì cực khổ: hậu tố kỹ
thuật `G` (`idG`, `versionG`), enum bị bọc thành `{ "value": "real" }`, và các
substitution group luôn lồng sâu thêm một cấp (`{ "sitAccident": { … } }`).

`datex2-ts` cung cấp **hai cách nhìn cho cùng một model**, chuyển đổi qua lại
không mất dữ liệu:

| | wire (`datex2-ts/wire`) | friendly (`datex2-ts/friendly`) |
| --- | --- | --- |
| định danh | `idG`, `versionG` | `id`, `version` |
| enum | `{ value: 'real' }` | `'real'` |
| substitution group | `{ sitAccident: { … } }` | `{ _type: 'Accident', … }` |
| dùng khi | đọc/ghi JSON DATEX II | viết code ứng dụng |

Toàn bộ types, enums và metadata runtime đều được **sinh tự động** từ bộ JSON
Schema **DATEX II v3.7** chính thức nằm trong [`schemas/`](./schemas): 19
namespace, 1608 định nghĩa. Không có dependency runtime nào.

## Cài đặt

```bash
npm install datex2-ts
```

## Bắt đầu nhanh

Viết một situation publication ở dạng friendly, có type-check và gợi ý đầy đủ:

```ts
import { create, encodeStrict, serialize } from 'datex2-ts';

const publication = create('PayloadPublicationG', {
  modelBaseVersion: '3',
  version: '3.7',
  _type: 'SituationPublication',
  lang: 'vi',
  publicationTime: new Date().toISOString(),
  publicationCreator: { country: 'vn', nationalIdentifier: 'HCMC' },
  situation: [
    {
      id: '12345',
      headerInformation: { informationStatus: 'real' },
      situationRecord: [
        {
          _type: 'Accident',
          id: '2322',
          version: '1',
          situationRecordCreationTime: '2026-08-20T14:32:00+07:00',
          situationRecordVersionTime: '2026-08-20T14:32:00+07:00',
          probabilityOfOccurrence: 'certain',
          accidentType: ['multipleVehicleAccident'],
          severity: 'high',
          validity: {
            validityStatus: 'active',
            validityTimeSpecification: { overallStartTime: '2026-08-20T14:32:00+07:00' },
          },
          locationReference: {
            _type: 'PointLocation',
            pointByCoordinates: {
              pointCoordinates: { latitude: 10.7769, longitude: 106.7009 },
            },
          },
        },
      ],
    },
  ],
});

// -> JSON DATEX II, ném lỗi nếu không hợp lệ theo model
const wire = encodeStrict('PayloadPublicationG', publication);

// -> document hoàn chỉnh, đã bọc trong envelope `payload`
const json = serialize(publication, 'PayloadPublicationG', { space: 2, validate: true });
```

`PayloadPublicationG` là substitution group của mọi publication trong DATEX II,
nên cùng một lời gọi đó dựng được `ParkingTablePublication`,
`EnergyInfrastructureStatusPublication`, `VmsPublication`… — chỉ cần đổi `_type`.

Đọc ngược lại:

```ts
import { collect, encode, parse } from 'datex2-ts';

const { type, value } = parse(json); // tự nhận diện envelope
value.situation?.[0]?.situationRecord[0]; // -> { _type: 'Accident', id: '2322', … }

// tìm mọi instance của một type ở bất kỳ đâu trong document (dạng wire)
const accidents = collect(encode(type, value), type, 'Accident');
```

## Model dạng friendly

### Enum là string thuần

```ts
import { AccidentTypeEnum, decode, encode } from 'datex2-ts';

encode('InformationStatusEnumG', 'real');            // { value: 'real' }
decode('InformationStatusEnumG', { value: 'real' }); // 'real'

AccidentTypeEnum.collision; // 'collision' — const object để dùng lúc runtime
```

DATEX II cho phép profile mở rộng enum. Trường hợp đó vẫn round-trip được, tên
kỹ thuật được dọn sạch:

```ts
encode('EmissionClassificationEuroEnumG', { value: 'extendedG', extendedValue: 'euro6d' });
// { value: 'extendedG', extendedValueG: 'euro6d' }
```

### Substitution group là discriminated union

```ts
import type { SituationRecordG } from 'datex2-ts/friendly';

function moTa(record: SituationRecordG): string {
  switch (record._type) {
    case 'Accident':
      return `${record.accidentType.join(', ')} lúc ${record.situationRecordCreationTime}`;
    case 'ConstructionWorks':
      return `công trường, ${record.validity.validityStatus}`;
    default:
      return record._type;
  }
}
```

Hỏi model xem một group nhận những thành viên nào:

```ts
import { membersOf } from 'datex2-ts';
membersOf('LocationReferenceG');
// ['LocationGroupByList', 'LocationGroupByReference', 'ItineraryByIndexedLocations',
//  'ItineraryByReference', 'LinearLocation', 'SingleRoadLinearLocation',
//  'PointLocation', 'PointLocationForParking', 'LocationByReference', 'AreaLocation']
```

### Input dễ tính

Ngoài dạng friendly, `encode()` / `toWire()` còn chấp nhận:

- tên thuộc tính dạng wire (`idG` lẫn `id`), tiện khi dữ liệu đang chuyển đổi dở;
- một giá trị đơn ở chỗ model cần mảng — sẽ tự bọc thành mảng;
- object `Date` ở chỗ cần chuỗi date-time;
- các thuộc tính model không khai báo: được giữ nguyên để dữ liệu profile /
  extension không bị mất khi round-trip (truyền `{ strict: true }` nếu muốn bỏ).

## Sửa các trường dữ liệu

### `edit()` — an toàn kiểu, bất biến

```ts
import { edit } from 'datex2-ts';

const next = edit(publication, (draft) => {
  const record = draft.situation![0]!.situationRecord[0]!;
  if (record._type === 'Accident') {
    record.accidentType = ['multipleVehicleAccident'];
    record.totalNumberOfVehiclesInvolved = 3;
  }
});
// `publication` không bị thay đổi
```

### Path — khi cần truy cập động

Path phân tách bằng dấu chấm, đọc/ghi sâu mà không cần chuỗi `?.`. Ghi luôn tạo
bản sao mới và tự tạo các cấp cha còn thiếu:

```ts
import { getIn, pushIn, select, setIn, updateIn, deleteIn } from 'datex2-ts';

const at = 'situation.0.situationRecord.0';

getIn(publication, `${at}.id`);                                // '2322'
setIn(publication, `${at}.version`, '2');                      // bản sao mới
updateIn(publication, `${at}.version`, (v) => String(+v! + 1));
pushIn(publication, `${at}.accidentType`, 'secondaryAccident');
deleteIn(publication, `${at}.collisionType`);

setIn({}, 'situation.0.situationRecord.0.id', '7');
// { situation: [{ situationRecord: [{ id: '7' }] }] }

select(publication, 'situation.*.situationRecord.*._type'); // ['Accident']
```

Ngoài ra còn có `hasIn`, `clone`, `freeze` và `prune` (bỏ `undefined`, `null` và
các container rỗng trước khi serialize).

## Kiểm tra hợp lệ

Việc kiểm tra dùng chính metadata đã sinh, nên không cần thư viện JSON Schema nào
lúc runtime, và báo lỗi theo đúng ngôn ngữ của model.

```ts
import { assertValid, check, isValid, validate } from 'datex2-ts';

validate(wire, 'PayloadPublicationG');    // Issue[] trên dạng wire
check('PayloadPublicationG', friendly);   // Issue[] trên dạng friendly
isValid(wire, 'PayloadPublicationG');
assertValid(wire, 'PayloadPublicationG'); // ném ValidationError
```

Mỗi `Issue` gồm `{ path, code, message, type }`, với các mã `missingRequired`,
`unknownProperty`, `wrongType`, `notAnArray`, `tooFewItems`, `tooManyItems`,
`notInEnum`, `emptyChoice`, `ambiguousChoice`, `outOfRange`, `tooLong`,
`patternMismatch`, `unknownType`.

Nếu muốn dùng validator JSON Schema, schema gốc cũng được đóng gói kèm:

```ts
import common from 'datex2-ts/schemas/datex2-v3.7/DATEXII_3_Common.json' with { type: 'json' };
```

## Document và envelope

```ts
import { detectRoot, parse, rootTypes, serialize, toDocument } from 'datex2-ts';

rootTypes;                       // { payload: 'PayloadPublicationG' }
detectRoot(doc);                 // { root, type, value } hoặc undefined
parse(jsonOrObject);             // tự nhận diện envelope
parse(fragment, 'Accident');     // chỉ định type cho fragment không có envelope
toDocument(value, type);         // giá trị wire đã bọc envelope
serialize(value, type, { space: 2, validate: true });
```

## Soi model lúc runtime

```ts
import { defs, getDef, namespaces, typeNames, typeNamesIn } from 'datex2-ts';

typeNames().length;        // toàn bộ type đã sinh
typeNamesIn('Situation');  // các type thuộc một namespace DATEX II
getDef('Accident');        // { ns, name, kind, props, open, … }
```

`walk(value, type, visitor)` duyệt document dạng wire theo chỉ dẫn của model;
`collect` / `collectWithPaths` được xây trên đó.

## Model DATEX II nào đang được đóng gói

Model đi kèm được sinh từ **gói model DATEX II phiên bản 3.7** chính thức
(<https://docs.datex2.eu/downloads/modelv37/>): 19 namespace, 1608 định nghĩa,
bao gồm `Situation`, `Parking`, `EnergyInfrastructure`,
`AfirEnergyInfrastructure`, `Facilities`, `AfirFacilities`, `RoadTrafficData`,
`Vms`, `TrafficRegulation`, `TrafficManagementPlan`, `ControlledZone`,
`FaultAndStatus`, `ReroutingManagementEnhanced`, `LocationReferencing`,
`UrbanExtensions` và các namespace `Common`.

Các namespace **Exchange / CIS** của DATEX II (`MessageContainer`,
`ExchangeInformation`) được publish ở một gói tải riêng, không nằm trong gói
model — nên bản này phủ phần payload publication chứ chưa phủ message envelope.

**Generator không bị khoá vào bộ schema đó.** Trỏ nó sang gói Exchange, sang một
phiên bản model cũ hơn, hay sang profile riêng của bạn, mọi thứ sẽ đi theo:

```bash
node scripts/generate.mjs schemas/my-profile
npm run typecheck && npm test
```

Nó hiểu cả hai dialect mà tooling DATEX II sinh ra: draft-04 dùng `definitions`
và draft 2020-12 dùng `$defs`. Xem thêm [`schemas/README.md`](./schemas/README.md).

## Phạm vi

- Hỗ trợ bản mã hoá **JSON** của DATEX II v3. XML/XSD nằm ngoài phạm vi.
- Việc kiểm tra bám theo những gì JSON Schema DATEX II diễn đạt được (cấu trúc,
  trường bắt buộc, enum, khoảng giá trị, độ dài, pattern, số phần tử). Các quy
  tắc chỉ mô tả bằng lời trong tiêu chuẩn thì không kiểm tra được.
- Chỉ import type (`datex2-ts/friendly`, `datex2-ts/wire`) thì không tốn gì lúc
  runtime. Import phần runtime sẽ kéo theo metadata của cả 1608 định nghĩa —
  khoảng 1 MB chưa minify, bundler sẽ nén lại, và điều này chủ yếu đáng quan tâm
  khi chạy trên trình duyệt.

## Phát triển

```bash
npm install
npm run generate    # sinh lại src/generated/ từ schemas/
npm run typecheck
npm test
npm run build
```

`src/generated/` được commit, và CI sẽ fail nếu nó lệch so với schema.

## Giấy phép

MIT
