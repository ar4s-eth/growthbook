import { FeatureInterface } from "back-end/types/feature";
import {
  validateFeatureValue,
  getValidation,
  validateJSONFeatureValue,
} from "../../src/util";

const feature: FeatureInterface = {
  dateCreated: new Date("2020-04-20"),
  dateUpdated: new Date("2020-04-20"),
  defaultValue: "true",
  environmentSettings: {},
  id: "feature-123",
  organization: "123",
  owner: "adnan",
  valueType: "boolean",
};

const exampleJsonSchema = {
  type: "object",
  properties: {
    test: {
      type: "string",
    },
  },
};

describe("getValidation", () => {
  it("returns validationEnabled as true if jsonSchema is populated and enabled", () => {
    feature.jsonSchema = {
      schema: JSON.stringify(exampleJsonSchema),
      date: new Date("2020-04-20"),
      enabled: true,
    };
    expect(getValidation(feature).validationEnabled).toEqual(true);
  });
  it("returns validationEnabled as false if jsonSchema enabled value is false", () => {
    feature.jsonSchema = {
      schema: JSON.stringify(exampleJsonSchema),
      date: new Date("2020-04-20"),
      enabled: false,
    };
    expect(getValidation(feature).validationEnabled).toEqual(false);
  });
  it("returns validationEnabled as false if jsonSchema is invalid", () => {
    feature.jsonSchema = {
      schema: "blahblah",
      date: new Date("2020-04-20"),
      enabled: false,
    };
    expect(getValidation(feature).validationEnabled).toEqual(false);
  });
  it("returns validationEnabled as false if jsonSchema is undefined", () => {
    feature.jsonSchema = undefined;
    expect(getValidation(feature).validationEnabled).toEqual(false);
  });
});

describe("validateJSONFeatureValue", () => {
  it("returns valid as true if all values are valid and json schema test passes", () => {
    const value = { test: "123" };
    feature.jsonSchema = {
      schema: JSON.stringify(exampleJsonSchema),
      date: new Date("2020-04-20"),
      enabled: true,
    };
    expect(validateJSONFeatureValue(value, feature).valid).toEqual(true);
  });
  it("returns valid as false if all values are valid but json schema test fails", () => {
    const value = { test: 999 };
    feature.jsonSchema = {
      schema: JSON.stringify(exampleJsonSchema),
      date: new Date("2020-04-20"),
      enabled: true,
    };
    expect(validateJSONFeatureValue(value, feature).valid).toEqual(false);
  });
  it("returns valid as false if json schema is invalid", () => {
    const value = { test: 999 };
    feature.jsonSchema = {
      schema: '{ "type": 123 }',
      date: new Date("2020-04-20"),
      enabled: true,
    };
    expect(validateJSONFeatureValue(value, feature).valid).toEqual(false);
  });
  it("returns valid as false if unparseable json value is supplied", () => {
    const value = "{ not json }";
    feature.jsonSchema = {
      schema: JSON.stringify(exampleJsonSchema),
      date: new Date("2020-04-20"),
      enabled: true,
    };
    expect(validateJSONFeatureValue(value, feature).valid).toEqual(false);
  });
  it("returns valid as true if validation is not enabled", () => {
    const value = { test: "123" };
    feature.jsonSchema = {
      schema: JSON.stringify(exampleJsonSchema),
      date: new Date("2020-04-20"),
      enabled: false,
    };
    expect(validateJSONFeatureValue(value, feature).valid).toEqual(true);
  });
});

describe("validateFeatureValue", () => {
  beforeAll(() => {
    feature.valueType = "boolean";
  });
  describe("boolean values", () => {
    it('returns "true" if value is truthy', () => {
      expect(validateFeatureValue(feature, "true", "testVal")).toEqual("true");
      expect(validateFeatureValue(feature, "0", "testVal")).toEqual("true");
    });
    it('returns "false" if value is "false"', () => {
      expect(validateFeatureValue(feature, "false", "testVal")).toEqual(
        "false"
      );
    });
  });

  describe("number values", () => {
    beforeAll(() => {
      feature.valueType = "number";
    });
    it("returns value if its a valid number", () => {
      let value = "0";
      expect(validateFeatureValue(feature, value, "testVal")).toEqual(value);
      value = "9918";
      expect(validateFeatureValue(feature, value, "testVal")).toEqual(value);
    });
    it("throws an error if value is not a valid number", () => {
      const value = "not-a-number";
      expect(() =>
        validateFeatureValue(feature, value, "testVal")
      ).toThrowError();
    });
  });

  describe("json values", () => {
    beforeAll(() => {
      feature.valueType = "json";
    });

    it("parses json and returns in string format", () => {
      const value = '{ "test": 123 }';
      expect(validateFeatureValue(feature, value, "testVal")).toEqual(
        '{"test": 123}'
      );
    });

    it('parses json that is "slightly" invalid', () => {
      let value = "{ technically: 'not valid' }";
      expect(validateFeatureValue(feature, value, "testVal")).toEqual(
        '{"technically": "not valid"}'
      );
      value = "this is not jsonbruv";
      expect(validateFeatureValue(feature, value, "testVal")).toEqual(
        `"${value}"`
      );
    });

    it("throws an error with invalid json", () => {
      const value = "{ not-an-object }";
      expect(() =>
        validateFeatureValue(feature, value, "testVal")
      ).toThrowError();
    });
  });
});
