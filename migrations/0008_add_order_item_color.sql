alter table order_items
add column if not exists color varchar(80) default '';

update order_items oi
set color = coalesce(nullif(oi.color, ''), nullif(pv.color, ''), '')
from product_variants pv
where oi.variant_id = pv.id
  and coalesce(oi.color, '') = ''
  and coalesce(pv.color, '') <> '';
