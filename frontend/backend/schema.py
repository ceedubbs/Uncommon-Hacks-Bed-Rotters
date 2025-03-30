from pydantic import BaseModel, EmailStr
from pydantic_extra_types.phone_numbers import PhoneNumber
from typing import Annotated, Union
import phonenumbers


PhoneNumberValidator = Annotated[Union[str, phonenumbers.PhoneNumber], 
                                PhoneNumber(default_region='US', supported_regions=['US'])]


class CreateUser(BaseModel):
    name: str
    email: EmailStr
    phone: PhoneNumberValidator

