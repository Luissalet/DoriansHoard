from datetime import date, datetime
from typing import Literal
from pydantic import BaseModel, ConfigDict, Field, model_validator, field_validator

Kind = Literal['owner_statement', 'attributed', 'inference', 'fiction', 'assistant']
State = Literal['proposed', 'confirmed', 'disputed', 'superseded', 'rejected']


class StrictModel(BaseModel):
    model_config = ConfigDict(extra='forbid')


class SourceInput(StrictModel):
    title: str = Field(min_length=1, max_length=200)
    text: str = Field(min_length=1, max_length=100_000)
    kind: Kind = 'owner_statement'
    author: str = Field(default='owner', min_length=1, max_length=200)

    @field_validator('title', 'author', mode='before')
    @classmethod
    def trim_metadata(cls, value):
        return value.strip() if isinstance(value, str) else value

    @field_validator('text')
    @classmethod
    def preserve_source(cls, value):
        if not value.strip():
            raise ValueError('empty_source')
        return value


class ClaimInput(StrictModel):
    source_id: str
    text: str = Field(min_length=1, max_length=2000)
    quote: str = Field(min_length=1, max_length=4000)
    kind: Kind = 'owner_statement'
    subject: Literal['owner', 'other'] = 'owner'
    valid_from: date | None = None
    valid_to: date | None = None
    dependencies: list[str] = Field(default_factory=list, max_length=50)

    @field_validator('text', 'quote')
    @classmethod
    def preserve_quote(cls, value):
        if not value.strip():
            raise ValueError('empty_claim')
        return value

    @model_validator(mode='after')
    def dates(self):
        if self.valid_from and self.valid_to and self.valid_from > self.valid_to:
            raise ValueError('invalid_date_range')
        return self


class ReviewInput(StrictModel):
    state: Literal['confirmed', 'disputed', 'rejected']


class CorrectionInput(StrictModel):
    reason: str = Field(min_length=1, max_length=2000)

    @field_validator('reason', mode='before')
    @classmethod
    def trim_reason(cls, value):
        return value.strip() if isinstance(value, str) else value


class QueryInput(StrictModel):
    query: str = Field(min_length=1, max_length=500)
    as_of: date | None = None


class SourceRecord(SourceInput):
    id: str
    created_at: datetime
    digest: str


class ClaimRecord(ClaimInput):
    id: str
    state: State
    created_at: datetime


class EventRecord(StrictModel):
    id: str
    claim_id: str
    action: str = Field(max_length=80)
    reason: str = Field(default='', max_length=2000)
    created_at: datetime


class Archive(StrictModel):
    format: Literal['selfhoard.archive']
    version: Literal[1]
    sources: list[SourceRecord] = Field(max_length=5000)
    claims: list[ClaimRecord] = Field(max_length=20000)
    events: list[EventRecord] = Field(max_length=50000)
