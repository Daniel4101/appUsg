curl -X GET \
  'test.api.ischarges.abb.com/odata/integration/its_cloud?$count=true&$top=5&$filter=reportingMonth%20eq%20%272024_10A%27' \
  -H 'X-API-KEY: B649A55E-5FB1-4494-93BF-B42C93BACD81' \
  -H 'Accept: application/json'


  curl -X GET ^
  "https://test.api.ischarges.abb.com/odata/integration/its_cloud" ^
  -H "X-API-KEY: B649A55E-5FB1-4494-93BF-B42C93BACD81" ^
  -H "Accept: application/json"





curl -X GET "https://test.api.ischarges.abb.com/odata/integration/its_cloud?groupby((reportingMonth), aggregate(cast(modifiedDate, Edm.DateTimeOffset) with max as maxModifiedDate))" -H "X-API-KEY: B649A55E-5FB1-4494-93BF-B42C93BACD81"
  -H "Accept: application/json"

curl -X GET "https://test.api.ischarges.abb.com/odata/integration/its_cloud?groupby((reportingMonth),aggregate(cast(modifiedDate,Edm.DateTimeOffset)with max as maxModifiedDate))" -H "X-API-KEY: B649A55E-5FB1-4494-93BF-B42C93BACD81"

curl -X GET "https://test.api.ischarges.abb.com/" -H "X-API-KEY: B649A55E-5FB1-4494-93BF-B42C93BACD81"


curl -X GET "https://test.api.ischarges.abb.com/dsc?$top=5&$filter=reportingQuartereq'2024_Q4'" -H "X-API-KEY: B649A55E-5FB1-4494-93BF-B42C93BACD81"

curl -s -i -X POST https://login.flexera.eu/oidc/token -H "Content-Type: application/x-www-form-urlencoded"  -d "grant_type=refresh_token&refresh_token=d1srsjEIpUSFmvoF6I2i-Dzd7jsPWsCKQoftasQdov4"